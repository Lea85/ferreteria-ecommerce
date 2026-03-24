import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ orders: [] });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) return NextResponse.json({ orders: [] });

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: {
          select: { productName: true, quantity: true, unitPrice: true, subtotal: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
      itemCount: o.items.length,
      items: o.items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        price: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    }));

    return NextResponse.json({ orders: mapped });
  } catch (error) {
    console.error("User orders error:", error);
    return NextResponse.json({ orders: [] });
  }
}
