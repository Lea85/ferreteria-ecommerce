import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

import { getAppBaseUrl } from "@/lib/app-url";
import type { MercadoPagoConfig as MpConfig } from "@/lib/mercadopago-settings";
import { prisma } from "@/lib/db";
import type { CheckoutCartItem } from "@/lib/services/checkout-order.service";

function mpClient(config: MpConfig) {
  return new MercadoPagoConfig({
    accessToken: config.accessToken,
    options: { timeout: 10000 },
  });
}

export async function createMercadoPagoPreference(params: {
  config: MpConfig;
  orderId: string;
  orderNumber: string;
  items: CheckoutCartItem[];
  subtotal: number;
  payerEmail: string;
  payerName: string;
}) {
  const { config, orderId, orderNumber, items, subtotal, payerEmail, payerName } =
    params;

  const baseUrl = getAppBaseUrl();
  const preferenceClient = new Preference(mpClient(config));

  const mpItems =
    items.length > 0
      ? items.map((item) => ({
          id: item.variantId || item.productId || item.name,
          title: item.name.slice(0, 256),
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.price) || 0,
          currency_id: "ARS",
        }))
      : [
          {
            id: orderNumber,
            title: `Pedido ${orderNumber}`,
            quantity: 1,
            unit_price: Number(subtotal) || 0,
            currency_id: "ARS",
          },
        ];

  const result = await preferenceClient.create({
    body: {
      items: mpItems,
      payer: {
        email: payerEmail,
        name: payerName,
      },
      external_reference: orderId,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${baseUrl}/checkout/exito?orderId=${orderId}`,
        failure: `${baseUrl}/checkout/pago?mp=failure&orderId=${orderId}`,
        pending: `${baseUrl}/checkout/exito?orderId=${orderId}&pending=1`,
      },
      auto_return: "approved",
      statement_descriptor: "FERROSAN",
      metadata: { order_id: orderId, order_number: orderNumber },
    },
  });

  return result;
}

export async function processMercadoPagoPayment(params: {
  config: MpConfig;
  orderId: string;
  formData: Record<string, unknown>;
}) {
  const { config, orderId, formData } = params;
  const paymentClient = new Payment(mpClient(config));

  const result = await paymentClient.create({
    body: {
      ...formData,
      metadata: { order_id: orderId },
    },
    requestOptions: {
      idempotencyKey: `${orderId}-${Date.now()}`,
    },
  });

  return result;
}

const APPROVED_STATUSES = new Set(["approved"]);
const PENDING_STATUSES = new Set(["pending", "in_process", "authorized"]);
const REJECTED_STATUSES = new Set(["rejected", "cancelled", "refunded", "charged_back"]);

export async function syncOrderFromMercadoPagoPayment(
  paymentId: string | number,
  config: MpConfig,
) {
  const paymentClient = new Payment(mpClient(config));
  const payment = await paymentClient.get({ id: String(paymentId) });

  const orderId =
    (payment.metadata as { order_id?: string } | undefined)?.order_id ||
    payment.external_reference;

  if (!orderId) {
    console.warn("Mercado Pago webhook: payment without order reference", paymentId);
    return null;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    console.warn("Mercado Pago webhook: order not found", orderId);
    return null;
  }

  const status = payment.status ?? "";

  if (APPROVED_STATUSES.has(status)) {
    if (order.status !== "PAYMENT_APPROVED") {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAYMENT_APPROVED",
            paymentStatus: status,
            paymentExternalId: String(payment.id),
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: "PAYMENT_APPROVED",
            note: `Pago Mercado Pago #${payment.id}`,
          },
        });
      });
    }
    return order.id;
  }

  if (PENDING_STATUSES.has(status)) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: status,
        paymentExternalId: String(payment.id),
      },
    });
    return order.id;
  }

  if (REJECTED_STATUSES.has(status) && order.status === "PENDING") {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          paymentStatus: status,
          paymentExternalId: String(payment.id),
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "CANCELLED",
          note: `Pago Mercado Pago rechazado (#${payment.id})`,
        },
      });
    });
    return order.id;
  }

  return order.id;
}

export async function markOrderPaidFromBrick(params: {
  orderId: string;
  paymentId: string | number;
  paymentStatus: string;
}) {
  const { orderId, paymentId, paymentStatus } = params;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;

  if (APPROVED_STATUSES.has(paymentStatus)) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PAYMENT_APPROVED",
          paymentStatus,
          paymentExternalId: String(paymentId),
        },
      });
      if (order.status !== "PAYMENT_APPROVED") {
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: order.status,
            toStatus: "PAYMENT_APPROVED",
            note: `Pago Mercado Pago #${paymentId}`,
          },
        });
      }
    });
  } else if (PENDING_STATUSES.has(paymentStatus)) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        paymentExternalId: String(paymentId),
      },
    });
  }

  return orderId;
}
