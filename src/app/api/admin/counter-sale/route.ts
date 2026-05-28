import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import type { PaymentMethod } from "@/lib/constants";
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

    const adminName =
      [session.user.name, (session.user as { lastName?: string }).lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || session.user.email || "Administrador";

    const order = await createCounterSaleOrder({
      adminUserId: session.user.id,
      adminName,
      paymentMethod: paymentMethod as PaymentMethod,
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
