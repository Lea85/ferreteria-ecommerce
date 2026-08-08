import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import type { PaymentMethod } from "@/lib/constants";
import { isCounterPaymentMethod } from "@/lib/services/counter-sale.service";
import {
  createOrderReturn,
  listOrderReturns,
} from "@/lib/services/order-return.service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const search = searchParams.get("search")?.trim() || undefined;
    const dateFrom = searchParams.get("dateFrom")?.trim() || undefined;
    const dateTo = searchParams.get("dateTo")?.trim() || undefined;

    const amountFromRaw = searchParams.get("amountFrom");
    const amountToRaw = searchParams.get("amountTo");
    const amountFrom =
      amountFromRaw != null && amountFromRaw !== ""
        ? Number(amountFromRaw)
        : undefined;
    const amountTo =
      amountToRaw != null && amountToRaw !== ""
        ? Number(amountToRaw)
        : undefined;

    if (
      (amountFrom != null && !Number.isFinite(amountFrom)) ||
      (amountTo != null && !Number.isFinite(amountTo))
    ) {
      return NextResponse.json({ error: "Montos inválidos." }, { status: 400 });
    }

    if (
      amountFrom != null &&
      amountTo != null &&
      amountFrom > amountTo
    ) {
      return NextResponse.json(
        { error: "El monto desde no puede ser mayor al monto hasta." },
        { status: 400 },
      );
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json(
        { error: "La fecha desde no puede ser posterior a la fecha hasta." },
        { status: 400 },
      );
    }

    const result = await listOrderReturns(page, limit, {
      search,
      dateFrom,
      dateTo,
      amountFrom,
      amountTo,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Returns GET error:", error);
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
    const refundMethod = String(body.refundMethod ?? "");
    const orderId = String(body.orderId ?? "");

    if (!orderId) {
      return NextResponse.json({ error: "Falta la venta de origen." }, { status: 400 });
    }

    if (!isCounterPaymentMethod(refundMethod)) {
      return NextResponse.json(
        { error: "Medio de reintegro inválido." },
        { status: 400 },
      );
    }

    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Seleccioná al menos un producto." },
        { status: 400 },
      );
    }

    const parsedItems = items.map((item: unknown) => {
      const row = item as Record<string, unknown>;
      return {
        orderItemId: String(row.orderItemId ?? ""),
        quantity: Math.max(1, Number(row.quantity) || 1),
      };
    });

    if (parsedItems.some((i) => !i.orderItemId)) {
      return NextResponse.json({ error: "Ítems inválidos." }, { status: 400 });
    }

    const processedByName =
      [session.user.name, (session.user as { lastName?: string }).lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || session.user.email || "Operador";

    const orderReturn = await createOrderReturn({
      orderId,
      refundMethod: refundMethod as PaymentMethod,
      items: parsedItems,
      notes: body.notes ? String(body.notes) : undefined,
      processedById: session.user.id,
      processedByName,
    });

    return NextResponse.json({ success: true, return: orderReturn });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al registrar la devolución.";
    console.error("Returns POST error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
