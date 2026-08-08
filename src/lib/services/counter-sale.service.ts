import type { PaymentMethod } from "@/lib/constants";
import {
  computeCounterSaleTotals,
  type CounterRoundingMode,
  DEFAULT_ROUNDING_MULTIPLE,
  isCounterDiscountPercent,
  roundMoney,
} from "@/lib/counter-sale-discount";
import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/services/order.service";

export type CounterSaleItemInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
};

const COUNTER_PAYMENT_METHODS: PaymentMethod[] = [
  "COUNTER_CASH",
  "COUNTER_CREDIT_CARD",
  "COUNTER_CREDIT_ABSORBE_LOCAL",
  "COUNTER_CREDIT_ABSORBE_BANCO",
  "COUNTER_DEBIT_CARD",
  "COUNTER_TRANSFER",
  "COUNTER_MERCADOLIBRE",
];

export function isCounterPaymentMethod(value: string): value is PaymentMethod {
  return COUNTER_PAYMENT_METHODS.includes(value as PaymentMethod);
}

const LEGACY_DEFAULT_SUFFIX = "-default";

/** IDs legacy del listado (`{productId}-default`) → variante real en BD. */
async function resolveVariantIds(
  items: CounterSaleItemInput[],
): Promise<CounterSaleItemInput[]> {
  const resolved: CounterSaleItemInput[] = [];

  for (const item of items) {
    if (!item.variantId.endsWith(LEGACY_DEFAULT_SUFFIX)) {
      resolved.push(item);
      continue;
    }

    const productId = item.variantId.slice(0, -LEGACY_DEFAULT_SUFFIX.length);
    const variant = await prisma.productVariant.findFirst({
      where: { productId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (!variant) {
      throw new Error(
        `No se encontró variante para el producto en el carrito. Volvé a agregar el ítem desde el catálogo.`,
      );
    }

    resolved.push({ ...item, variantId: variant.id });
  }

  return resolved;
}

export type CounterSaleOrderOptions = {
  adminUserId: string;
  adminName: string;
  paymentMethod: PaymentMethod;
  /** Solo para COUNTER_MERCADOLIBRE: monto efectivamente cobrado. */
  chargeTotal?: number;
  /** Descuento mostrador: 0, 5, 10, 15, 20, 25 o 30 (%). */
  discountPercent?: number;
  /** Redondeo aplicado después del descuento porcentual. */
  roundingMode?: CounterRoundingMode;
  roundingMultiple?: number;
  roundingManualTotal?: number;
  items: CounterSaleItemInput[];
  /** Al vender un presupuesto, se marca como SOLD en la misma transacción. */
  quoteId?: string;
  quoteNumber?: string;
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
};

export async function sellQuoteAsCounterSale(data: {
  quoteId: string;
  adminUserId: string;
  adminName: string;
  paymentMethod: PaymentMethod;
  chargeTotal?: number;
  discountPercent?: number;
}) {
  const quote = await prisma.quote.findUnique({
    where: { id: data.quoteId },
    include: {
      items: true,
      user: { select: { name: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!quote) {
    throw new Error("Presupuesto no encontrado.");
  }
  if (quote.status !== "ACTIVE") {
    throw new Error("Solo se pueden vender presupuestos activos.");
  }
  if (quote.items.length === 0) {
    throw new Error("El presupuesto no tiene productos.");
  }

  const customerName =
    [quote.user.name, quote.user.lastName].filter(Boolean).join(" ").trim() ||
    "Cliente presupuesto";

  return createCounterSaleOrder({
    adminUserId: data.adminUserId,
    adminName: data.adminName,
    paymentMethod: data.paymentMethod,
    chargeTotal: data.chargeTotal,
    discountPercent: data.discountPercent,
    items: quote.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    customerName,
    customerEmail: quote.user.email,
    customerPhone: quote.user.phone,
  });
}

export async function createCounterSaleOrder(data: CounterSaleOrderOptions) {
  if (data.items.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  const orderNumber = await generateOrderNumber();
  const resolvedItems = await resolveVariantIds(data.items);
  const variantIds = resolvedItems.map((i) => i.variantId);

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: { select: { id: true, name: true, isActive: true } },
    },
  });

  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const orderItems: {
    variantId: string;
    productId: string;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[] = [];

  let subtotal = 0;

  for (const item of resolvedItems) {
    const variant = variantMap.get(item.variantId);
    if (!variant) {
      throw new Error(`Variante no encontrada.`);
    }
    if (!variant.product.isActive) {
      throw new Error(`El producto "${variant.product.name}" no está activo.`);
    }

    const lineSubtotal = item.unitPrice * item.quantity;
    subtotal += lineSubtotal;

    orderItems.push({
      variantId: variant.id,
      productId: variant.product.id,
      productName: variant.product.name,
      variantName: variant.name,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: lineSubtotal,
    });
  }

  const discountPercent = data.discountPercent ?? 0;
  if (!isCounterDiscountPercent(discountPercent)) {
    throw new Error("Porcentaje de descuento inválido.");
  }

  const roundingMode = data.roundingMode ?? "none";
  const saleTotals = computeCounterSaleTotals(subtotal, discountPercent, {
    mode: roundingMode,
    multiple:
      roundingMode === "multiple"
        ? data.roundingMultiple ?? DEFAULT_ROUNDING_MULTIPLE
        : undefined,
    manualTotal:
      roundingMode === "manual" ? data.roundingManualTotal : undefined,
  });

  const totalAfterDiscount = saleTotals.totalAfterDiscount;

  const orderTotal =
    data.paymentMethod === "COUNTER_MERCADOLIBRE" && data.chargeTotal != null
      ? data.chargeTotal
      : saleTotals.finalTotal;

  if (orderTotal <= 0) {
    throw new Error("El total a cobrar debe ser mayor a cero.");
  }

  if (
    data.paymentMethod === "COUNTER_MERCADOLIBRE" &&
    data.chargeTotal == null
  ) {
    throw new Error("Indicá el total a cobrar para ventas MercadoLibre.");
  }

  const discountTotal = roundMoney(subtotal - orderTotal);
  const roundingDiscount = saleTotals.roundingDiscount;

  const discountNote =
    discountPercent > 0
      ? ` — descuento ${discountPercent}% (−${saleTotals.discountAmount.toFixed(2)})`
      : "";

  const roundingNote =
    roundingDiscount > 0
      ? ` — descuento redondeo (−${roundingDiscount.toFixed(2)})`
      : "";

  return prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    const mlNote =
      data.paymentMethod === "COUNTER_MERCADOLIBRE" &&
      data.chargeTotal != null &&
      data.chargeTotal !== totalAfterDiscount
        ? ` — total cobrado ML: ${orderTotal.toFixed(2)} (referencia ${totalAfterDiscount.toFixed(2)})`
        : "";

    const notes = data.quoteNumber
      ? `Compra mostrador — presupuesto ${data.quoteNumber} — operador: ${data.adminName}${discountNote}${roundingNote}${mlNote}`
      : `Compra mostrador — operador: ${data.adminName}${discountNote}${roundingNote}${mlNote}`;

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: data.adminUserId,
        status: "PAYMENT_APPROVED",
        customerType: "CONSUMER",
        shippingMethod: "STORE_PICKUP",
        paymentMethod: data.paymentMethod,
        customerName: data.customerName ?? "Venta mostrador",
        customerEmail: data.customerEmail ?? null,
        customerPhone: data.customerPhone ?? null,
        billingName: data.customerName ?? "Consumidor final",
        subtotal,
        discountTotal,
        shippingCost: 0,
        taxTotal: 0,
        total: orderTotal,
        notes,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            originalPrice: item.unitPrice,
            subtotal: item.subtotal,
            discount: 0,
          })),
        },
        statusHistory: {
          create: [
            {
              fromStatus: null,
              toStatus: "PENDING",
              note: "Venta mostrador iniciada",
              changedBy: data.adminUserId,
            },
            {
              fromStatus: "PENDING",
              toStatus: "PAYMENT_APPROVED",
              note: "Pago confirmado en mostrador",
              changedBy: data.adminUserId,
            },
          ],
        },
      },
      include: {
        items: {
          select: {
            productName: true,
            variantName: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
          },
        },
      },
    });

    if (data.quoteId) {
      await tx.quote.update({
        where: { id: data.quoteId },
        data: {
          status: "SOLD",
          soldAt: new Date(),
          soldOrderId: order.id,
        },
      });
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      discountPercent,
      percentDiscountAmount: saleTotals.discountAmount,
      roundingDiscount,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        productName: i.productName,
        variantName: i.variantName,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    };
  });
}
