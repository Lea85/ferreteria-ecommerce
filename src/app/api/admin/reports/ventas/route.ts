import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getOrderSalesChannel } from "@/lib/order-channel";

const EXCLUDED_STATUSES = ["CANCELLED", "REFUNDED"] as const;

function getDateFrom(period: string): Date {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 86400000);
    case "15d":
      return new Date(now.getTime() - 15 * 86400000);
    case "30d":
      return new Date(now.getTime() - 30 * 86400000);
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getTime() - 30 * 86400000);
  }
}

/** Día calendario Argentina (UTC-3) → rango en UTC para Prisma. */
function getDayRange(dateStr: string): { gte: Date; lte: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T03:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { gte: start, lte: end };
}

function buildChannelMetrics(
  orders: { total: unknown; paymentMethod: string; notes: string | null }[],
) {
  let counterRevenue = 0;
  let counterOrders = 0;
  let webRevenue = 0;
  let webOrders = 0;

  for (const order of orders) {
    const total = Number(order.total);
    if (getOrderSalesChannel(order) === "counter") {
      counterRevenue += total;
      counterOrders += 1;
    } else {
      webRevenue += total;
      webOrders += 1;
    }
  }

  return {
    counter: {
      revenue: counterRevenue,
      orders: counterOrders,
      avgTicket: counterOrders > 0 ? counterRevenue / counterOrders : 0,
    },
    web: {
      revenue: webRevenue,
      orders: webOrders,
      avgTicket: webOrders > 0 ? webRevenue / webOrders : 0,
    },
  };
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
    const periodRaw = searchParams.get("period") || "day";
    const period = periodRaw === "today" ? "day" : periodRaw;
    const dateParam = searchParams.get("date")?.trim() || "";

    const todayArgentina = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date());

    let createdAtFilter: Prisma.DateTimeFilter;
    let periodLabel = period;

    if (period === "day") {
      const dayRange =
        getDayRange(dateParam) ?? getDayRange(todayArgentina);
      if (!dayRange) {
        return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
      }
      createdAtFilter = { gte: dayRange.gte, lte: dayRange.lte };
      periodLabel = dateParam || new Date().toISOString().slice(0, 10);
    } else {
      createdAtFilter = { gte: getDateFrom(period) };
    }

    const orders = await prisma.order.findMany({
      where: {
        createdAt: createdAtFilter,
        status: { notIn: EXCLUDED_STATUSES },
      },
      include: { items: true },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const newCustomersCreatedAt: Prisma.DateTimeFilter =
      period === "day" && "lte" in createdAtFilter
        ? { gte: createdAtFilter.gte, lte: createdAtFilter.lte }
        : { gte: getDateFrom(period) };

    const newCustomers = await prisma.user.count({
      where: { createdAt: newCustomersCreatedAt, role: "CUSTOMER" },
    });

    const channelBreakdown = buildChannelMetrics(orders);

    const productSales: Record<
      string,
      { name: string; sku: string; units: number; revenue: number }
    > = {};
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.sku || item.productName;
        if (!productSales[key]) {
          productSales[key] = {
            name: item.productName,
            sku: item.sku || "N/A",
            units: 0,
            revenue: 0,
          };
        }
        productSales[key].units += item.quantity;
        productSales[key].revenue += Number(item.subtotal);
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);
    const leastSold = Object.values(productSales)
      .sort((a, b) => a.units - b.units)
      .slice(0, 10);

    const allVariants = await prisma.productVariant.findMany({
      where: { isActive: true },
      select: { sku: true, stock: true, product: { select: { name: true } } },
      orderBy: { stock: "desc" },
    });

    const mostStock = allVariants.slice(0, 8).map((v) => ({
      name: v.product.name,
      sku: v.sku,
      stock: v.stock,
    }));
    const leastStock = [...allVariants]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8)
      .map((v) => ({
        name: v.product.name,
        sku: v.sku,
        stock: v.stock,
      }));

    const categorySales: Record<
      string,
      { name: string; orders: number; revenue: number }
    > = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (item.productId) {
          const prod = await prisma.product.findUnique({
            where: { id: item.productId },
            select: {
              categories: { select: { category: { select: { name: true } } } },
            },
          });
          const catName = prod?.categories?.[0]?.category?.name || "Sin categoria";
          if (!categorySales[catName]) {
            categorySales[catName] = { name: catName, orders: 0, revenue: 0 };
          }
          categorySales[catName].orders += 1;
          categorySales[catName].revenue += Number(item.subtotal);
        }
      }
    }

    const totalCatRevenue = Object.values(categorySales).reduce(
      (s, c) => s + c.revenue,
      0,
    );
    const topCategories = Object.values(categorySales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((c) => ({
        ...c,
        pct:
          totalCatRevenue > 0
            ? Math.round((c.revenue / totalCatRevenue) * 100)
            : 0,
      }));

    return NextResponse.json({
      period,
      periodLabel,
      metrics: { totalRevenue, totalOrders, avgTicket, newCustomers },
      channelBreakdown,
      topProducts,
      leastSold,
      mostStock,
      leastStock,
      topCategories,
    });
  } catch (error) {
    console.error("Reports ventas error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
