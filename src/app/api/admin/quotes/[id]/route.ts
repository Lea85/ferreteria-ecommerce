import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import type { PaymentMethod } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { parseCounterDiscountPercent } from "@/lib/counter-sale-discount";
import {
  isCounterPaymentMethod,
  sellQuoteAsCounterSale,
} from "@/lib/services/counter-sale.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, lastName: true, email: true, phone: true } },
        items: {
          include: {
            variant: {
              select: { stock: true, isActive: true },
            },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Presupuesto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("Admin quote detail:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "sell") {
      const paymentMethod = String(body.paymentMethod ?? "");
      if (!isCounterPaymentMethod(paymentMethod)) {
        return NextResponse.json(
          { error: "Seleccioná un medio de pago válido." },
          { status: 400 },
        );
      }

      const chargeTotal =
        paymentMethod === "COUNTER_MERCADOLIBRE"
          ? Number(body.chargeTotal)
          : undefined;

      if (paymentMethod === "COUNTER_MERCADOLIBRE") {
        if (!Number.isFinite(chargeTotal) || chargeTotal! <= 0) {
          return NextResponse.json(
            { error: "Indicá un total a cobrar válido para MercadoLibre." },
            { status: 400 },
          );
        }
      } else if (body.chargeTotal != null) {
        return NextResponse.json(
          { error: "El total personalizado solo aplica a Compra MercadoLibre." },
          { status: 400 },
        );
      }

      let discountPercent = 0;
      try {
        discountPercent = parseCounterDiscountPercent(body.discountPercent ?? 0);
      } catch {
        return NextResponse.json(
          { error: "Porcentaje de descuento inválido." },
          { status: 400 },
        );
      }

      const adminName =
        [session.user.name, (session.user as { lastName?: string }).lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || session.user.email || "Administrador";

      const order = await sellQuoteAsCounterSale({
        quoteId: id,
        adminUserId: session.user.id,
        adminName,
        paymentMethod: paymentMethod as PaymentMethod,
        chargeTotal,
        discountPercent,
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        order,
      });
    }

    if (action === "cancel") {
      await prisma.quote.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al vender el presupuesto.";
    console.error("Admin quote update:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
