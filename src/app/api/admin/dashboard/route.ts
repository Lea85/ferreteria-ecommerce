import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const [revenueAgg, totalOrders, totalProducts, totalCustomers] =
      await Promise.all([
        prisma.order.aggregate({ _sum: { total: true } }),
        prisma.order.count(),
        prisma.product.count({ where: { isActive: true } }),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
      ]);

    const totalRevenue = Number(revenueAgg._sum.total ?? 0);

    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        status: true,
        total: true,
        createdAt: true,
      },
    });

    const lowStockCandidates = await prisma.productVariant.findMany({
      where: { isActive: true },
      select: {
        sku: true,
        stock: true,
        lowStockThreshold: true,
        product: { select: { id: true, name: true } },
      },
    });

    const lowStock = lowStockCandidates
      .filter((v) => v.stock <= v.lowStockThreshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8)
      .map((v) => ({
        id: v.product.id,
        name: v.product.name,
        sku: v.sku,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
      }));

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      recentOrders: recentOrders.map((o) => ({
        ...o,
        total: Number(o.total),
      })),
      lowStock,
    });
  } catch (error) {
    console.error("Admin dashboard GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
