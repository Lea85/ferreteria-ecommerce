import { NextResponse } from "next/server";

import { getMercadoPagoConfig } from "@/lib/mercadopago-settings";
import { prisma } from "@/lib/db";
import {
  markOrderPaidFromBrick,
  processMercadoPagoPayment,
} from "@/lib/services/mercadopago.service";

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
    const { orderId, formData } = body as {
      orderId?: string;
      formData?: Record<string, unknown>;
    };

    if (!orderId || !formData) {
      return NextResponse.json({ error: "Datos de pago invalidos." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }
    if (order.paymentMethod !== "MERCADO_PAGO") {
      return NextResponse.json({ error: "Metodo de pago invalido." }, { status: 400 });
    }
    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "El pedido fue cancelado." }, { status: 400 });
    }

    const payment = await processMercadoPagoPayment({
      config: mpConfig,
      orderId,
      formData,
    });

    const paymentStatus = payment.status ?? "pending";
    await markOrderPaidFromBrick({
      orderId,
      paymentId: payment.id ?? "",
      paymentStatus,
    });

    return NextResponse.json({
      id: payment.id,
      status: paymentStatus,
      statusDetail: payment.status_detail,
    });
  } catch (error) {
    console.error("Mercado Pago process:", error);
    return NextResponse.json({ error: "No se pudo procesar el pago." }, { status: 500 });
  }
}
