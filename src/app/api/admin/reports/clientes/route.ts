import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

function getDateFrom(period: string): Date {
  const now = new Date();
  switch (period) {
    case "7d": return new Date(now.getTime() - 7 * 86400000);
    case "1m": return new Date(now.getTime() - 30 * 86400000);
    case "6m": return new Date(now.getTime() - 180 * 86400000);
    case "1y": return new Date(now.getTime() - 365 * 86400000);
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
    const period = searchParams.get("period") || "1m";
    const dateFrom = getDateFrom(period);

    const users = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        customerType: true,
        createdAt: true,
        orders: {
          where: { createdAt: { gte: dateFrom } },
          select: {
            total: true,
            items: { select: { quantity: true } },
            createdAt: true,
          },
        },
      },
    });

    const clients = users.map((u) => {
      const itemsBought = u.orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
      const totalSpent = u.orders.reduce((sum, o) => sum + Number(o.total), 0);
      const orderCount = u.orders.length;

      return {
        id: u.id,
        name: `${u.name}${u.lastName ? " " + u.lastName : ""}`,
        email: u.email,
        customerType: u.customerType,
        orderCount,
        itemsBought,
        totalSpent,
      };
    });

    const totalClients = clients.length;
    const activeClients = clients.filter((c) => c.orderCount > 0).length;
    const totalItems = clients.reduce((s, c) => s + c.itemsBought, 0);
    const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0);

    const byItems = [...clients].sort((a, b) => b.itemsBought - a.itemsBought);
    const bySpent = [...clients].sort((a, b) => b.totalSpent - a.totalSpent);
    const byOrders = [...clients].sort((a, b) => b.orderCount - a.orderCount);

    return NextResponse.json({
      summary: { totalClients, activeClients, totalItems, totalRevenue },
      topBuyers: byItems.slice(0, 5),
      leastBuyers: byItems.filter((c) => c.itemsBought >= 0).reverse().slice(0, 5),
      topSpenders: bySpent.slice(0, 5),
      leastSpenders: bySpent.filter((c) => c.totalSpent >= 0).reverse().slice(0, 5),
      mostActive: byOrders.slice(0, 5),
      leastActive: byOrders.filter((c) => c.orderCount >= 0).reverse().slice(0, 5),
    });
  } catch (error) {
    console.error("Reports clientes error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
