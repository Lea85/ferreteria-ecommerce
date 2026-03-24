import { NextResponse } from "next/server";

import { OrderStatus, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const ORDER_STATUSES = Object.values(OrderStatus) as string[];

function isOrderStatus(v: string): v is OrderStatus {
  return ORDER_STATUSES.includes(v);
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusParam = searchParams.get("status")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
    );

    const where: Prisma.OrderWhereInput = {};

    if (statusParam && isOrderStatus(statusParam)) {
      where.status = statusParam;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          status: true,
          shippingMethod: true,
          paymentMethod: true,
          subtotal: true,
          total: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        status: o.status,
        shippingMethod: o.shippingMethod,
        paymentMethod: o.paymentMethod,
        subtotal: Number(o.subtotal),
        total: Number(o.total),
        createdAt: o.createdAt,
        _count: { items: o._count.items },
      })),
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Admin orders GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
