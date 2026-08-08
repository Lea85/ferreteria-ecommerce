import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { getOrderReturnById } from "@/lib/services/order-return.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await context.params;
    const orderReturn = await getOrderReturnById(id);
    if (!orderReturn) {
      return NextResponse.json({ error: "Devolución no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ return: orderReturn });
  } catch (error) {
    console.error("Return detail GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
