import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import type { PaymentMethod } from "@/lib/constants";
import {
  parseCounterDiscountPercent,
  parseCounterRoundingMode,
} from "@/lib/counter-sale-discount";
import {
  createCounterSaleOrder,
  isCounterPaymentMethod,
} from "@/lib/services/counter-sale.service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    if (searchParams.get("checkPermission") === "true") {
      const allowed =
        !!session?.user?.id && isAdminRole(session.user.role as string);
      return NextResponse.json({ canCounterSale: allowed });
    }

    if (!session?.user?.id || !isAdminRole(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Counter sale GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const paymentMethod = String(body.paymentMethod ?? "");

    if (!isCounterPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        { error: "Medio de pago inválido." },
        { status: 400 },
      );
    }

    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío." }, { status: 400 });
    }

    const parsedItems = items.map((item: unknown) => {
      const row = item as Record<string, unknown>;
      return {
        variantId: String(row.variantId ?? ""),
        quantity: Math.max(1, Number(row.quantity) || 1),
        unitPrice: Number(row.unitPrice) || 0,
      };
    });

    if (parsedItems.some((i) => !i.variantId)) {
      return NextResponse.json({ error: "Ítems inválidos." }, { status: 400 });
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

    let roundingMode = "none" as ReturnType<typeof parseCounterRoundingMode>;
    try {
      roundingMode = parseCounterRoundingMode(body.roundingMode ?? "none");
    } catch {
      return NextResponse.json(
        { error: "Modo de redondeo inválido." },
        { status: 400 },
      );
    }

    const roundingMultiple =
      roundingMode === "multiple" ? Number(body.roundingMultiple) : undefined;
    const roundingManualTotal =
      roundingMode === "manual" ? Number(body.roundingManualTotal) : undefined;

    const adminName =
      [session.user.name, (session.user as { lastName?: string }).lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || session.user.email || "Administrador";

    const order = await createCounterSaleOrder({
      adminUserId: session.user.id,
      adminName,
      paymentMethod: paymentMethod as PaymentMethod,
      chargeTotal,
      discountPercent,
      roundingMode,
      roundingMultiple,
      roundingManualTotal,
      items: parsedItems,
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al registrar la venta.";
    console.error("Counter sale POST error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
