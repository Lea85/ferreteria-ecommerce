import type { Prisma } from "@/generated/prisma";
import { OrderStatus } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { getOrderSalesChannel, isMercadoLibreCounterSale } from "@/lib/order-channel";

export const SALES_EXCLUDED_STATUSES: OrderStatus[] = [OrderStatus.CANCELLED];

export type OrderItemForProfit = {
  variantId: string | null;
  quantity: number;
  subtotal: unknown;
  unitCostSnapshot?: unknown | null;
};

export type ReturnItemForMetrics = {
  variantId: string | null;
  quantity: number;
  subtotal: unknown;
  unitCostSnapshot?: unknown | null;
};

function resolveUnitCost(
  item: { variantId: string | null; unitCostSnapshot?: unknown | null },
  costByVariantId: Map<string, number>,
): number | undefined {
  if (item.variantId) {
    const fromVariant = costByVariantId.get(item.variantId);
    if (fromVariant !== undefined) return fromVariant;
  }
  if (item.unitCostSnapshot != null) return Number(item.unitCostSnapshot);
  return undefined;
}

export function computeItemsProfit(
  items: OrderItemForProfit[],
  costByVariantId: Map<string, number>,
): number {
  let profit = 0;
  for (const item of items) {
    const unitCost = resolveUnitCost(item, costByVariantId);
    if (unitCost === undefined) continue;
    profit += Number(item.subtotal) - unitCost * item.quantity;
  }
  return profit;
}

export function computeReturnItemsProfit(
  items: ReturnItemForMetrics[],
  costByVariantId: Map<string, number>,
): number {
  let profit = 0;
  for (const item of items) {
    const unitCost = resolveUnitCost(item, costByVariantId);
    if (unitCost === undefined) continue;
    profit += Number(item.subtotal) - unitCost * item.quantity;
  }
  return profit;
}

export async function loadVariantCostMapFromItems(
  items: { variantId: string | null }[],
): Promise<Map<string, number>> {
  const variantIds = [
    ...new Set(
      items.map((i) => i.variantId).filter((id): id is string => Boolean(id)),
    ),
  ];
  if (variantIds.length === 0) return new Map();

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, costPrice: true },
  });

  const map = new Map<string, number>();
  for (const v of variants) {
    if (v.costPrice != null) map.set(v.id, Number(v.costPrice));
  }
  return map;
}

export function buildChannelMetrics(
  orders: { total: unknown; paymentMethod: string; notes: string | null }[],
  returns: {
    total: unknown;
    order: { paymentMethod: string; notes: string | null };
  }[],
) {
  let counterRevenue = 0;
  let counterOrders = 0;
  let webRevenue = 0;
  let webOrders = 0;
  let mercadolibreRevenue = 0;
  let mercadolibreOrders = 0;

  for (const order of orders) {
    const total = Number(order.total);
    const channel = getOrderSalesChannel(order);
    if (channel === "mercadolibre") {
      mercadolibreRevenue += total;
      mercadolibreOrders += 1;
    } else if (channel === "counter") {
      counterRevenue += total;
      counterOrders += 1;
    } else {
      webRevenue += total;
      webOrders += 1;
    }
  }

  for (const ret of returns) {
    const total = Number(ret.total);
    const channel = getOrderSalesChannel(ret.order);
    if (channel === "mercadolibre") {
      mercadolibreRevenue -= total;
    } else if (channel === "counter") {
      counterRevenue -= total;
    } else {
      webRevenue -= total;
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
    mercadolibre: {
      revenue: mercadolibreRevenue,
      orders: mercadolibreOrders,
      avgTicket:
        mercadolibreOrders > 0 ? mercadolibreRevenue / mercadolibreOrders : 0,
    },
  };
}

export function excludeMercadoLibreOrders<
  T extends { paymentMethod: string },
>(orders: T[]): T[] {
  return orders.filter((o) => !isMercadoLibreCounterSale(o.paymentMethod));
}

export function excludeMercadoLibreReturns<
  T extends { order: { paymentMethod: string } },
>(returns: T[]): T[] {
  return returns.filter((r) => !isMercadoLibreCounterSale(r.order.paymentMethod));
}

export type DateRangeFilter = Prisma.DateTimeFilter;

export async function fetchSalesOrdersInPeriod(createdAtFilter: DateRangeFilter) {
  return prisma.order.findMany({
    where: {
      createdAt: createdAtFilter,
      status: { notIn: SALES_EXCLUDED_STATUSES },
    },
    include: { items: true },
  });
}

export async function fetchReturnsInPeriod(createdAtFilter: DateRangeFilter) {
  return prisma.orderReturn.findMany({
    where: {
      createdAt: createdAtFilter,
      status: "COMPLETED",
    },
    include: {
      items: true,
      order: {
        select: {
          paymentMethod: true,
          notes: true,
        },
      },
    },
  });
}
