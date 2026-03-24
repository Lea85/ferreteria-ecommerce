import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const [totalProducts, activeProducts, totalCategories, totalUsers, totalOrders] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.count(),
    ]);

    const categoriesWithCount = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        name: true,
        products: { select: { productId: true } },
      },
    });

    const productsByCategory = categoriesWithCount
      .map((c) => ({ name: c.name, count: c.products.length }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    const allVariants = await prisma.productVariant.findMany({
      where: { isActive: true },
      select: { stock: true },
    });

    const stockRanges = [
      { range: "Sin stock (0)", min: 0, max: 0, color: "#ef4444" },
      { range: "Bajo (1-5)", min: 1, max: 5, color: "#f59e0b" },
      { range: "Normal (6-20)", min: 6, max: 20, color: "#2563eb" },
      { range: "Alto (21-50)", min: 21, max: 50, color: "#16a34a" },
      { range: "Muy alto (51+)", min: 51, max: Infinity, color: "#8b5cf6" },
    ];

    const stockDistribution = stockRanges.map((r) => ({
      range: r.range,
      count: allVariants.filter((v) => v.stock >= r.min && v.stock <= r.max).length,
      color: r.color,
    })).filter((r) => r.count > 0);

    const usersByTypeRaw = await prisma.user.groupBy({
      by: ["customerType"],
      where: { role: "CUSTOMER" },
      _count: { id: true },
    });

    const typeLabels: Record<string, string> = {
      CONSUMER: "Consumidor final", TRADE: "Profesional", WHOLESALE: "Mayorista",
    };
    const typeColors: Record<string, string> = {
      CONSUMER: "#2563eb", TRADE: "#16a34a", WHOLESALE: "#f59e0b",
    };

    const usersByType = usersByTypeRaw.map((u) => ({
      type: typeLabels[u.customerType] || u.customerType,
      count: u._count.id,
      color: typeColors[u.customerType] || "#8b5cf6",
    }));

    return NextResponse.json({
      totalProducts,
      activeProducts,
      totalCategories,
      totalUsers,
      totalOrders,
      productsByCategory,
      stockDistribution,
      usersByType,
    });
  } catch (error) {
    console.error("Reports sitio error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
