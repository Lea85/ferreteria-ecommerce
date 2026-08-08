import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { searchOrdersForReturn } from "@/lib/services/order-return.service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return NextResponse.json({ orders: [] });
    }

    const orders = await searchOrdersForReturn(q);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Returns search error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
