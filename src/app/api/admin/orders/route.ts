import { NextResponse } from "next/server";

import { OrderStatus, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { buildCreatedAtRangeFilter } from "@/lib/date-range";

const ORDER_STATUSES = Object.values(OrderStatus) as string[];
const EXPORT_MAX = 10_000;

function isOrderStatus(v: string): v is OrderStatus {
  return ORDER_STATUSES.includes(v);
}

function mapOrder(o: {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  status: OrderStatus;
  shippingMethod: string;
  paymentMethod: string;
  subtotal: unknown;
  total: unknown;
  createdAt: Date;
  _count: { items: number };
}) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    status: o.status,
    shippingMethod: o.shippingMethod,
    paymentMethod: o.paymentMethod,
    subtotal: Number(o.subtotal),
    total: Number(o.total),
    createdAt: o.createdAt.toISOString(),
    _count: { items: o._count.items },
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as { role?: string }).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusParam = searchParams.get("status")?.trim();
    const dateFrom = searchParams.get("dateFrom")?.trim() || "";
    const dateTo = searchParams.get("dateTo")?.trim() || "";
    const isExport = searchParams.get("export") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
    );

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json(
        { error: "La fecha desde no puede ser posterior a la fecha hasta." },
        { status: 400 },
      );
    }

    const createdAtFilter = buildCreatedAtRangeFilter(dateFrom, dateTo);
    if ((dateFrom || dateTo) && !createdAtFilter) {
      return NextResponse.json({ error: "Fechas inválidas." }, { status: 400 });
    }

    const where: Prisma.OrderWhereInput = {};

    if (statusParam && isOrderStatus(statusParam)) {
      where.status = statusParam;
    }

    if (createdAtFilter) {
      where.createdAt = createdAtFilter;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const select = {
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
    } as const;

    if (isExport) {
      const total = await prisma.order.count({ where });
      if (total > EXPORT_MAX) {
        return NextResponse.json(
          {
            error: `Hay ${total} ventas en el rango. Acotá el filtro (máximo ${EXPORT_MAX} filas para exportar).`,
          },
          { status: 400 },
        );
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select,
      });

      return NextResponse.json({
        orders: orders.map(mapOrder),
        total,
        export: true,
      });
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json({
      orders: orders.map(mapOrder),
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Admin orders GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
