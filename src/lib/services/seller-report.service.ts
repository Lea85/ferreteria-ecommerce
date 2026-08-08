import { prisma } from "@/lib/db";
import { isCounterPaymentMethod } from "@/lib/order-channel";
import type { ParsedSalesReportPeriod } from "@/lib/sales-report-period";
import { SALES_EXCLUDED_STATUSES } from "@/lib/sales-metrics";

export type SellerRow = {
  userId: string | null;
  name: string;
  email: string | null;
  role: string;
  orderCount: number;
  unitsSold: number;
  revenue: number;
  avgTicket: number;
  mercadolibreOrders: number;
  mercadolibreRevenue: number;
};

export type SellerReportResult = {
  period: string;
  periodLabel: string;
  monthStatus?: ParsedSalesReportPeriod["monthStatus"];
  statusMessage?: string;
  summary: {
    sellers: number;
    totalOrders: number;
    totalUnits: number;
    totalRevenue: number;
  };
  byRevenue: SellerRow[];
  byUnits: SellerRow[];
};

function parseOperatorFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/operador:\s*(.+?)(?:\s*—|$)/i);
  const name = match?.[1]?.trim();
  return name || null;
}

function emptyReport(parsed: ParsedSalesReportPeriod): SellerReportResult {
  return {
    period: parsed.period,
    periodLabel: parsed.periodLabel,
    monthStatus: parsed.monthStatus,
    statusMessage: parsed.statusMessage,
    summary: {
      sellers: 0,
      totalOrders: 0,
      totalUnits: 0,
      totalRevenue: 0,
    },
    byRevenue: [],
    byUnits: [],
  };
}

/**
 * Ranking de vendedores (admin / mostrador) por ventas de mostrador.
 * Usa `userId` del pedido (operador) y, si falta, el nombre en notes.
 */
export async function buildSellerReport(
  parsed: ParsedSalesReportPeriod,
): Promise<SellerReportResult> {
  if (!parsed.createdAtFilter) {
    return emptyReport(parsed);
  }

  const orders = await prisma.order.findMany({
    where: {
      createdAt: parsed.createdAtFilter,
      status: { notIn: SALES_EXCLUDED_STATUSES },
      OR: [
        { notes: { contains: "Compra mostrador" } },
        {
          paymentMethod: {
            in: [
              "COUNTER_CASH",
              "COUNTER_CREDIT_CARD",
              "COUNTER_CREDIT_ABSORBE_LOCAL",
              "COUNTER_CREDIT_ABSORBE_BANCO",
              "COUNTER_DEBIT_CARD",
              "COUNTER_TRANSFER",
              "COUNTER_MERCADOLIBRE",
            ],
          },
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      total: true,
      paymentMethod: true,
      notes: true,
      items: { select: { quantity: true } },
    },
  });

  const userIds = [
    ...new Set(
      orders.map((o) => o.userId).filter((id): id is string => Boolean(id)),
    ),
  ];

  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            role: true,
          },
        })
      : [];

  const userById = new Map(users.map((u) => [u.id, u]));

  type Acc = {
    userId: string | null;
    name: string;
    email: string | null;
    role: string;
    orderCount: number;
    unitsSold: number;
    revenue: number;
    mercadolibreOrders: number;
    mercadolibreRevenue: number;
  };

  const byKey = new Map<string, Acc>();

  for (const order of orders) {
    if (!isCounterPaymentMethod(order.paymentMethod)) continue;

    const user = order.userId ? userById.get(order.userId) : undefined;
    const fromNotes = parseOperatorFromNotes(order.notes);
    const name =
      (user
        ? [user.name, user.lastName].filter(Boolean).join(" ").trim()
        : "") ||
      fromNotes ||
      "Operador sin identificar";
    const role = user?.role ?? "MOSTRADOR";
    const email = user?.email ?? null;
    const key = order.userId ?? `name:${name.toLowerCase()}`;

    const units = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const total = Number(order.total);
    const isMeli = order.paymentMethod === "COUNTER_MERCADOLIBRE";

    const acc = byKey.get(key) ?? {
      userId: order.userId,
      name,
      email,
      role,
      orderCount: 0,
      unitsSold: 0,
      revenue: 0,
      mercadolibreOrders: 0,
      mercadolibreRevenue: 0,
    };

    acc.orderCount += 1;
    acc.unitsSold += units;
    acc.revenue += total;
    if (isMeli) {
      acc.mercadolibreOrders += 1;
      acc.mercadolibreRevenue += total;
    }
    byKey.set(key, acc);
  }

  const rows: SellerRow[] = [...byKey.values()].map((a) => ({
    userId: a.userId,
    name: a.name,
    email: a.email,
    role: a.role,
    orderCount: a.orderCount,
    unitsSold: a.unitsSold,
    revenue: a.revenue,
    avgTicket: a.orderCount > 0 ? a.revenue / a.orderCount : 0,
    mercadolibreOrders: a.mercadolibreOrders,
    mercadolibreRevenue: a.mercadolibreRevenue,
  }));

  const byRevenue = [...rows].sort((a, b) => b.revenue - a.revenue);
  const byUnits = [...rows].sort((a, b) => b.unitsSold - a.unitsSold);

  return {
    period: parsed.period,
    periodLabel: parsed.periodLabel,
    monthStatus: parsed.monthStatus,
    statusMessage: parsed.statusMessage,
    summary: {
      sellers: rows.length,
      totalOrders: rows.reduce((s, r) => s + r.orderCount, 0),
      totalUnits: rows.reduce((s, r) => s + r.unitsSold, 0),
      totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
    },
    byRevenue,
    byUnits,
  };
}
