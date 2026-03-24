import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

function getDateFrom(period: string): Date {
  const now = new Date();
  switch (period) {
    case "7d": return new Date(now.getTime() - 7 * 86400000);
    case "15d": return new Date(now.getTime() - 15 * 86400000);
    case "30d": return new Date(now.getTime() - 30 * 86400000);
    case "ytd": return new Date(now.getFullYear(), 0, 1);
    default: return new Date(now.getTime() - 30 * 86400000);
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const dateFrom = getDateFrom(period);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: dateFrom } },
      include: { items: true },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const newCustomers = await prisma.user.count({
      where: { createdAt: { gte: dateFrom }, role: "CUSTOMER" },
    });

    const productSales: Record<string, { name: string; sku: string; units: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.sku || item.productName;
        if (!productSales[key]) {
          productSales[key] = { name: item.productName, sku: item.sku || "N/A", units: 0, revenue: 0 };
        }
        productSales[key].units += item.quantity;
        productSales[key].revenue += Number(item.subtotal);
      }
    }

    const topProducts = Object.values(productSales).sort((a, b) => b.units - a.units).slice(0, 10);
    const leastSold = Object.values(productSales).sort((a, b) => a.units - b.units).slice(0, 10);

    const allVariants = await prisma.productVariant.findMany({
      where: { isActive: true },
      select: { sku: true, stock: true, product: { select: { name: true } } },
      orderBy: { stock: "desc" },
    });

    const mostStock = allVariants.slice(0, 8).map((v) => ({
      name: v.product.name, sku: v.sku, stock: v.stock,
    }));
    const leastStock = [...allVariants].sort((a, b) => a.stock - b.stock).slice(0, 8).map((v) => ({
      name: v.product.name, sku: v.sku, stock: v.stock,
    }));

    const categorySales: Record<string, { name: string; orders: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (item.productId) {
          const prod = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { categories: { select: { category: { select: { name: true } } } } },
          });
          const catName = prod?.categories?.[0]?.category?.name || "Sin categoria";
          if (!categorySales[catName]) categorySales[catName] = { name: catName, orders: 0, revenue: 0 };
          categorySales[catName].orders += 1;
          categorySales[catName].revenue += Number(item.subtotal);
        }
      }
    }

    const totalCatRevenue = Object.values(categorySales).reduce((s, c) => s + c.revenue, 0);
    const topCategories = Object.values(categorySales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((c) => ({ ...c, pct: totalCatRevenue > 0 ? Math.round((c.revenue / totalCatRevenue) * 100) : 0 }));

    return NextResponse.json({
      metrics: { totalRevenue, totalOrders, avgTicket, newCustomers },
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
