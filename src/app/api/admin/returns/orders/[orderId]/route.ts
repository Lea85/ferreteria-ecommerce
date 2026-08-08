import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { getOrderForReturn } from "@/lib/services/order-return.service";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { orderId } = await context.params;
    const order = await getOrderForReturn(orderId);
    if (!order) {
      return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cargar la venta.";
    console.error("Return order GET error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
