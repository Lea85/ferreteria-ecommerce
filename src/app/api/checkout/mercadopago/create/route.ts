import { NextResponse } from "next/server";

import { getMercadoPagoConfig } from "@/lib/mercadopago-settings";
import { prisma } from "@/lib/db";
import {
  CheckoutOrderError,
  createCheckoutOrder,
} from "@/lib/services/checkout-order.service";
import { createMercadoPagoPreference } from "@/lib/services/mercadopago.service";

export async function POST(request: Request) {
  try {
    const mpConfig = await getMercadoPagoConfig();
    if (!mpConfig) {
      return NextResponse.json(
        { error: "Mercado Pago no esta configurado." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const {
      contactData,
      billingData,
      shippingAddress,
      shippingMethod,
      items,
      subtotal,
    } = body;

    const order = await createCheckoutOrder({
      paymentMethod: "MERCADO_PAGO",
      shippingMethod: shippingMethod || "STORE_PICKUP",
      contactData,
      billingData,
      shippingAddress,
      items,
      subtotal,
      status: "PENDING",
    });

    const orderSubtotal = Number(order.subtotal) || 0;
    const orderTotal = Number(order.total) || 0;
    const discountRatio =
      orderSubtotal > 0 ? orderTotal / orderSubtotal : 1;

    const preference = await createMercadoPagoPreference({
      config: mpConfig,
      orderId: order.id,
      orderNumber: order.orderNumber,
      items,
      subtotal,
      payerEmail: contactData.email,
      payerName: `${contactData.nombre} ${contactData.apellido}`.trim(),
      discountRatio,
    });

    if (preference.id) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentExternalId: preference.id },
      });
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      preferenceId: preference.id,
      publicKey: mpConfig.publicKey,
    });
  } catch (error) {
    if (error instanceof CheckoutOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Mercado Pago create:", error);
    return NextResponse.json({ error: "Error al iniciar el pago." }, { status: 500 });
  }
}
