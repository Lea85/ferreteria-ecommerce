import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { auth, isAdminRole, isFullAdmin } from "@/lib/auth";
import { isLowStock } from "@/lib/low-stock";

export async function GET() {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !isAdminRole((session.user as { role?: string }).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const role = (session.user as { role?: string }).role;
    const showRevenue = isFullAdmin(role);

    const [revenueAgg, returnsAgg, totalOrders, totalProducts, totalCustomers] =
      await Promise.all([
        showRevenue
          ? prisma.order.aggregate({
              where: { status: { not: "CANCELLED" } },
              _sum: { total: true },
            })
          : Promise.resolve({ _sum: { total: null } }),
        showRevenue
          ? prisma.orderReturn.aggregate({
              where: { status: "COMPLETED" },
              _sum: { total: true },
            })
          : Promise.resolve({ _sum: { total: null } }),
        prisma.order.count(),
        prisma.product.count({ where: { isActive: true } }),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
      ]);

    const totalRevenue = showRevenue
      ? Number(revenueAgg._sum.total ?? 0) - Number(returnsAgg._sum.total ?? 0)
      : null;

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

    const pendingApprovalWhere = {
      role: "CUSTOMER" as const,
      isApproved: false,
    };

    const [pendingApprovalsCount, pendingApprovalUsers] = await Promise.all([
      prisma.user.count({ where: pendingApprovalWhere }),
      prisma.user.findMany({
        where: pendingApprovalWhere,
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          phone: true,
          companyName: true,
          taxId: true,
          customerType: true,
          createdAt: true,
        },
      }),
    ]);

    const lowStockCandidates = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true },
      },
      select: {
        sku: true,
        stock: true,
        lowStockThreshold: true,
        product: { select: { id: true, name: true } },
      },
    });

    const lowStock = lowStockCandidates
      .filter((v) => isLowStock(v.stock, v.lowStockThreshold))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8)
      .map((v) => ({
        id: v.product.id,
        name: v.product.name,
        sku: v.sku,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
      }));

    // Presupuestos que vencen en los próximos 1–2 días (hasta 48 hs) y no están vendidos/cancelados.
    const now = new Date();
    const expiresUntil = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const expiringQuotes = await prisma.quote.findMany({
      where: {
        status: { notIn: ["SOLD", "CANCELLED"] },
        validUntil: {
          gte: now,
          lte: expiresUntil,
        },
      },
      orderBy: { validUntil: "asc" },
      take: 20,
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        total: true,
        validUntil: true,
        user: {
          select: {
            name: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

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
      pendingApprovalsCount,
      pendingApprovals: pendingApprovalUsers.map((u) => ({
        id: u.id,
        name: u.name,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        companyName: u.companyName,
        taxId: u.taxId,
        customerType: u.customerType,
        createdAt: u.createdAt,
      })),
      expiringQuotes: expiringQuotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        total: Number(q.total),
        validUntil: q.validUntil.toISOString(),
        customerName: [q.user.name, q.user.lastName].filter(Boolean).join(" "),
        customerEmail: q.user.email,
        customerPhone: q.user.phone,
      })),
    });
  } catch (error) {
    console.error("Admin dashboard GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
