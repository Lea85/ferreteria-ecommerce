import { prisma } from "@/lib/db";
import { getOrderSalesChannel } from "@/lib/order-channel";
import type { ParsedSalesReportPeriod } from "@/lib/sales-report-period";
import {
  buildChannelMetrics,
  computeItemsProfit,
  computeReturnItemsProfit,
  excludeMercadoLibreOrders,
  excludeMercadoLibreReturns,
  fetchReturnsInPeriod,
  fetchSalesOrdersInPeriod,
  loadVariantCostMapFromItems,
} from "@/lib/sales-metrics";

export type ChannelMetrics = {
  revenue: number;
  orders: number;
  avgTicket: number;
};

export type ProductRow = {
  name: string;
  sku: string;
  units: number;
  revenue: number;
  profit: number;
  margin: number | null;
};

export type StockRow = { name: string; sku: string; stock: number };

export type CategoryRow = {
  name: string;
  orders: number;
  revenue: number;
  profit: number;
  margin: number | null;
  pct: number;
};

export type ChannelOrderRow = {
  orderNumber: string;
  itemCount: number;
  paymentMethod: string;
  total: number;
};

export type SalesReportResult = {
  period: string;
  periodLabel: string;
  monthStatus?: "past" | "in_progress" | "future";
  statusMessage?: string;
  metrics: {
    totalRevenue: number;
    grossRevenue: number;
    returnsRevenue: number;
    totalProfit: number;
    totalOrders: number;
    totalReturns: number;
    avgTicket: number;
  };
  channelBreakdown: {
    counter: ChannelMetrics;
    web: ChannelMetrics;
    mercadolibre: ChannelMetrics;
  };
  topProducts: ProductRow[];
  leastSold: ProductRow[];
  mostStock: StockRow[];
  leastStock: StockRow[];
  topCategories: CategoryRow[];
  channelOrders: {
    counter: ChannelOrderRow[];
    web: ChannelOrderRow[];
    mercadolibre: ChannelOrderRow[];
  };
  allProductsSold: ProductRow[];
  allCategories: CategoryRow[];
};

type OrderWithItems = Awaited<ReturnType<typeof fetchSalesOrdersInPeriod>>[number];
type ReturnWithItems = Awaited<ReturnType<typeof fetchReturnsInPeriod>>[number];

async function loadCategoryNameByProductId(
  productIds: string[],
): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      categories: {
        take: 1,
        orderBy: { category: { position: "asc" } },
        select: { category: { select: { name: true } } },
      },
    },
  });

  const map = new Map<string, string>();
  for (const product of products) {
    map.set(
      product.id,
      product.categories[0]?.category.name ?? "Sin categoria",
    );
  }
  return map;
}

async function loadCategoryNameByVariantId(
  variantIds: string[],
): Promise<Map<string, string>> {
  if (variantIds.length === 0) return new Map();

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      product: {
        select: {
          categories: {
            take: 1,
            orderBy: { category: { position: "asc" } },
            select: { category: { select: { name: true } } },
          },
        },
      },
    },
  });

  const map = new Map<string, string>();
  for (const variant of variants) {
    map.set(
      variant.id,
      variant.product.categories[0]?.category.name ?? "Sin categoria",
    );
  }
  return map;
}

function emptyReport(parsed: ParsedSalesReportPeriod): SalesReportResult {
  const emptyChannel = { revenue: 0, orders: 0, avgTicket: 0 };
  return {
    period: parsed.period,
    periodLabel: parsed.periodLabel,
    monthStatus: parsed.monthStatus,
    statusMessage: parsed.statusMessage,
    metrics: {
      totalRevenue: 0,
      grossRevenue: 0,
      returnsRevenue: 0,
      totalProfit: 0,
      totalOrders: 0,
      totalReturns: 0,
      avgTicket: 0,
    },
    channelBreakdown: {
      counter: { ...emptyChannel },
      web: { ...emptyChannel },
      mercadolibre: { ...emptyChannel },
    },
    topProducts: [],
    leastSold: [],
    mostStock: [],
    leastStock: [],
    topCategories: [],
    channelOrders: { counter: [], web: [], mercadolibre: [] },
    allProductsSold: [],
    allCategories: [],
  };
}

function buildChannelOrderRows(orders: OrderWithItems[]): ChannelOrderRow[] {
  return orders
    .map((order) => ({
      orderNumber: order.orderNumber,
      itemCount: order.items.length,
      paymentMethod: order.paymentMethod,
      total: Number(order.total),
    }))
    .sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
}

function computeLineProfit(
  variantId: string | null,
  quantity: number,
  subtotal: number,
  costByVariantId: Map<string, number>,
  unitCostSnapshot?: unknown | null,
): number {
  let unitCost: number | undefined;
  if (variantId) {
    unitCost = costByVariantId.get(variantId);
  }
  if (unitCost === undefined && unitCostSnapshot != null) {
    unitCost = Number(unitCostSnapshot);
  }
  if (unitCost === undefined) return 0;
  return subtotal - unitCost * quantity;
}

function marginFromTotals(revenue: number, profit: number): number | null {
  const cost = revenue - profit;
  if (cost <= 0) return null;
  return (profit / cost) * 100;
}

export async function buildSalesReport(
  parsed: ParsedSalesReportPeriod,
): Promise<SalesReportResult> {
  if (!parsed.createdAtFilter) {
    return emptyReport(parsed);
  }

  const [orders, returns] = await Promise.all([
    fetchSalesOrdersInPeriod(parsed.createdAtFilter),
    fetchReturnsInPeriod(parsed.createdAtFilter),
  ]);

  const ordersExcludingMercadoLibre = excludeMercadoLibreOrders(orders);
  const returnsExcludingMercadoLibre = excludeMercadoLibreReturns(returns);

  const grossRevenue = ordersExcludingMercadoLibre.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );
  const returnsRevenue = returnsExcludingMercadoLibre.reduce(
    (sum, ret) => sum + Number(ret.total),
    0,
  );
  const totalRevenue = grossRevenue - returnsRevenue;
  const totalOrders = ordersExcludingMercadoLibre.length;
  const totalReturns = returnsExcludingMercadoLibre.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const allItemsForCost = [
    ...ordersExcludingMercadoLibre.flatMap((order) => order.items),
    ...returnsExcludingMercadoLibre.flatMap((ret) => ret.items),
  ];
  const costByVariantId = await loadVariantCostMapFromItems(allItemsForCost);

  const grossProfit = ordersExcludingMercadoLibre.reduce(
    (sum, order) => sum + computeItemsProfit(order.items, costByVariantId),
    0,
  );
  const returnsProfit = returnsExcludingMercadoLibre.reduce(
    (sum, ret) => sum + computeReturnItemsProfit(ret.items, costByVariantId),
    0,
  );
  const totalProfit = grossProfit - returnsProfit;

  const channelBreakdown = buildChannelMetrics(orders, returns);

  const productSales: Record<
    string,
    { name: string; sku: string; units: number; revenue: number; profit: number }
  > = {};

  function applyProductLine(
    key: string,
    name: string,
    sku: string,
    variantId: string | null,
    units: number,
    revenue: number,
    sign: 1 | -1,
    unitCostSnapshot?: unknown | null,
  ) {
    if (!productSales[key]) {
      productSales[key] = { name, sku, units: 0, revenue: 0, profit: 0 };
    }
    productSales[key].units += units * sign;
    productSales[key].revenue += revenue * sign;
    productSales[key].profit +=
      computeLineProfit(
        variantId,
        units,
        revenue,
        costByVariantId,
        unitCostSnapshot,
      ) * sign;
  }

  for (const order of ordersExcludingMercadoLibre) {
    for (const item of order.items) {
      const key = item.sku || item.productName;
      applyProductLine(
        key,
        item.productName,
        item.sku || "N/A",
        item.variantId,
        item.quantity,
        Number(item.subtotal),
        1,
        item.unitCostSnapshot,
      );
    }
  }

  for (const ret of returnsExcludingMercadoLibre) {
    for (const item of ret.items) {
      const key = item.sku || item.productName;
      applyProductLine(
        key,
        item.productName,
        item.sku || "N/A",
        item.variantId,
        item.quantity,
        Number(item.subtotal),
        -1,
        item.unitCostSnapshot,
      );
    }
  }

  const toProductRow = (p: (typeof productSales)[string]): ProductRow => ({
    name: p.name,
    sku: p.sku,
    units: p.units,
    revenue: p.revenue,
    profit: p.profit,
    margin: marginFromTotals(p.revenue, p.profit),
  });

  const allProductsSold = Object.values(productSales)
    .filter((product) => product.units > 0)
    .map(toProductRow)
    .sort((a, b) => b.units - a.units);

  const topProducts = allProductsSold.slice(0, 10);
  const leastSold = [...allProductsSold]
    .sort((a, b) => a.units - b.units)
    .slice(0, 10);

  const allVariants = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: { sku: true, stock: true, product: { select: { name: true } } },
    orderBy: { stock: "desc" },
  });

  const mostStock = allVariants.slice(0, 8).map((variant) => ({
    name: variant.product.name,
    sku: variant.sku,
    stock: variant.stock,
  }));
  const leastStock = [...allVariants]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8)
    .map((variant) => ({
      name: variant.product.name,
      sku: variant.sku,
      stock: variant.stock,
    }));

  const productIds = [
    ...new Set(
      [
        ...ordersExcludingMercadoLibre.flatMap((order) =>
          order.items.map((item) => item.productId),
        ),
        ...returnsExcludingMercadoLibre.flatMap((item) => []),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  const returnVariantIds = [
    ...new Set(
      returnsExcludingMercadoLibre
        .flatMap((ret) => ret.items.map((item) => item.variantId))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [categoryByProductId, categoryByVariantId] = await Promise.all([
    loadCategoryNameByProductId(productIds),
    loadCategoryNameByVariantId(returnVariantIds),
  ]);

  const categorySales: Record<
    string,
    { name: string; orders: number; revenue: number; profit: number }
  > = {};

  function applyCategoryLine(
    catName: string,
    variantId: string | null,
    quantity: number,
    subtotal: number,
    sign: 1 | -1,
    countOrder = false,
    unitCostSnapshot?: unknown | null,
  ) {
    if (!categorySales[catName]) {
      categorySales[catName] = {
        name: catName,
        orders: 0,
        revenue: 0,
        profit: 0,
      };
    }
    if (countOrder) categorySales[catName].orders += 1;
    categorySales[catName].revenue += subtotal * sign;
    categorySales[catName].profit +=
      computeLineProfit(
        variantId,
        quantity,
        subtotal,
        costByVariantId,
        unitCostSnapshot,
      ) * sign;
  }

  for (const order of ordersExcludingMercadoLibre) {
    for (const item of order.items) {
      const catName = item.productId
        ? categoryByProductId.get(item.productId) ?? "Sin categoria"
        : "Sin categoria";
      applyCategoryLine(
        catName,
        item.variantId,
        item.quantity,
        Number(item.subtotal),
        1,
        true,
        item.unitCostSnapshot,
      );
    }
  }

  for (const ret of returnsExcludingMercadoLibre) {
    for (const item of ret.items) {
      const catName = item.variantId
        ? categoryByVariantId.get(item.variantId) ?? "Sin categoria"
        : "Sin categoria";
      applyCategoryLine(
        catName,
        item.variantId,
        item.quantity,
        Number(item.subtotal),
        -1,
        false,
        item.unitCostSnapshot,
      );
    }
  }

  const totalCatRevenue = Object.values(categorySales).reduce(
    (sum, category) => sum + Math.max(0, category.revenue),
    0,
  );

  const allCategories = Object.values(categorySales)
    .filter((category) => category.revenue > 0)
    .map((category) => ({
      ...category,
      pct:
        totalCatRevenue > 0
          ? Math.round((category.revenue / totalCatRevenue) * 100)
          : 0,
      margin: marginFromTotals(category.revenue, category.profit),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topCategories = allCategories.slice(0, 8);

  const counterOrders = orders.filter(
    (order) => getOrderSalesChannel(order) === "counter",
  );
  const webOrders = orders.filter(
    (order) => getOrderSalesChannel(order) === "web",
  );
  const meliOrders = orders.filter(
    (order) => getOrderSalesChannel(order) === "mercadolibre",
  );

  return {
    period: parsed.period,
    periodLabel: parsed.periodLabel,
    monthStatus: parsed.monthStatus,
    statusMessage: parsed.statusMessage,
    metrics: {
      totalRevenue,
      grossRevenue,
      returnsRevenue,
      totalProfit,
      totalOrders,
      totalReturns,
      avgTicket,
    },
    channelBreakdown,
    topProducts,
    leastSold,
    mostStock,
    leastStock,
    topCategories,
    channelOrders: {
      counter: buildChannelOrderRows(counterOrders),
      web: buildChannelOrderRows(webOrders),
      mercadolibre: buildChannelOrderRows(meliOrders),
    },
    allProductsSold,
    allCategories,
  };
}
