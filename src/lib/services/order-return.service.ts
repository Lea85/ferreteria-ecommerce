import type { PaymentMethod } from "@/lib/constants";
import { RETURN_PREFIX } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  computeLineRefundAmount,
  getReturnableQuantity,
} from "@/lib/order-return-refund";
import { isCounterPaymentMethod } from "@/lib/services/counter-sale.service";
import type { OrderStatus, Prisma } from "@/generated/prisma";

const NON_RETURNABLE_STATUSES: OrderStatus[] = [
  "PENDING",
  "PAYMENT_PENDING",
  "CANCELLED",
  "REFUNDED",
];

export type ReturnItemInput = {
  orderItemId: string;
  quantity: number;
};

export async function generateReturnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${RETURN_PREFIX}-${year}-`;

  const last = await prisma.orderReturn.findFirst({
    where: { returnNumber: { startsWith: prefix } },
    orderBy: { returnNumber: "desc" },
    select: { returnNumber: true },
  });

  let sequence = 1;
  if (last) {
    const lastNum = parseInt(last.returnNumber.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) sequence = lastNum + 1;
  }

  return `${prefix}${String(sequence).padStart(6, "0")}`;
}

function serializeReturnableOrder(order: {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: unknown;
  total: unknown;
  createdAt: Date;
  items: {
    id: string;
    productName: string;
    variantName: string | null;
    sku: string | null;
    variantId: string | null;
    quantity: number;
    quantityReturned: number;
    unitPrice: unknown;
    subtotal: unknown;
  }[];
}) {
  const orderSubtotal = Number(order.subtotal);
  const orderTotal = Number(order.total);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    subtotal: orderSubtotal,
    total: orderTotal,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => {
      const returnableQty = getReturnableQuantity(
        item.quantity,
        item.quantityReturned,
      );
      return {
        id: item.id,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        variantId: item.variantId,
        quantity: item.quantity,
        quantityReturned: item.quantityReturned,
        returnableQuantity: returnableQty,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        maxRefundAmount: computeLineRefundAmount(
          Number(item.subtotal),
          item.quantity,
          returnableQty,
          orderSubtotal,
          orderTotal,
        ),
      };
    }),
  };
}

export async function searchOrdersForReturn(query: string, limit = 20) {
  const q = query.trim();
  if (!q) return [];

  const statusFilter: Prisma.OrderWhereInput = {
    status: { notIn: NON_RETURNABLE_STATUSES },
  };

  const orFilters: Prisma.OrderWhereInput[] = [
    { orderNumber: { contains: q, mode: "insensitive" } },
    { customerName: { contains: q, mode: "insensitive" } },
    { customerPhone: { contains: q, mode: "insensitive" } },
    { customerEmail: { contains: q, mode: "insensitive" } },
    {
      items: {
        some: {
          OR: [
            { sku: { contains: q, mode: "insensitive" } },
            { productName: { contains: q, mode: "insensitive" } },
          ],
        },
      },
    },
  ];

  const orders = await prisma.order.findMany({
    where: { ...statusFilter, OR: orFilters },
    include: {
      items: {
        select: {
          id: true,
          productName: true,
          variantName: true,
          sku: true,
          variantId: true,
          quantity: true,
          quantityReturned: true,
          unitPrice: true,
          subtotal: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return orders
    .map(serializeReturnableOrder)
    .filter((o) => o.items.some((i) => i.returnableQuantity > 0));
}

export async function getOrderForReturn(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          id: true,
          productName: true,
          variantName: true,
          sku: true,
          variantId: true,
          quantity: true,
          quantityReturned: true,
          unitPrice: true,
          subtotal: true,
        },
      },
    },
  });

  if (!order) return null;
  if (NON_RETURNABLE_STATUSES.includes(order.status)) {
    throw new Error("Esta venta no admite devoluciones.");
  }

  const serialized = serializeReturnableOrder(order);
  if (!serialized.items.some((i) => i.returnableQuantity > 0)) {
    throw new Error("No quedan productos por devolver en esta venta.");
  }

  return serialized;
}

export async function createOrderReturn(data: {
  orderId: string;
  refundMethod: PaymentMethod;
  items: ReturnItemInput[];
  notes?: string;
  processedById: string;
  processedByName: string;
}) {
  if (!isCounterPaymentMethod(data.refundMethod)) {
    throw new Error("Medio de reintegro inválido.");
  }

  if (!data.items.length) {
    throw new Error("Seleccioná al menos un producto para devolver.");
  }

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("Venta no encontrada.");
  }
  if (NON_RETURNABLE_STATUSES.includes(order.status)) {
    throw new Error("Esta venta no admite devoluciones.");
  }

  const orderSubtotal = Number(order.subtotal);
  const orderTotal = Number(order.total);
  const itemMap = new Map(order.items.map((i) => [i.id, i]));

  const returnLines: {
    orderItemId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    stockVariantId: string | null;
  }[] = [];

  let subtotal = 0;

  for (const input of data.items) {
    const item = itemMap.get(input.orderItemId);
    if (!item) {
      throw new Error("Ítem de venta no encontrado.");
    }

    const qty = Math.floor(Number(input.quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error(`Cantidad inválida para ${item.productName}.`);
    }

    const returnable = getReturnableQuantity(
      item.quantity,
      item.quantityReturned,
    );
    if (qty > returnable) {
      throw new Error(
        `No podés devolver ${qty} unidades de "${item.productName}" (máximo ${returnable}).`,
      );
    }

    const lineSubtotal = computeLineRefundAmount(
      Number(item.subtotal),
      item.quantity,
      qty,
      orderSubtotal,
      orderTotal,
    );

    if (lineSubtotal <= 0) {
      throw new Error(`El reintegro de "${item.productName}" debe ser mayor a cero.`);
    }

    subtotal += lineSubtotal;

    returnLines.push({
      orderItemId: item.id,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      quantity: qty,
      unitPrice: lineSubtotal / qty,
      subtotal: lineSubtotal,
      stockVariantId: item.variantId,
    });
  }

  const total = Math.round(subtotal * 100) / 100;
  if (total <= 0) {
    throw new Error("El total a reintegrar debe ser mayor a cero.");
  }

  const returnNumber = await generateReturnNumber();

  return prisma.$transaction(async (tx) => {
    for (const line of returnLines) {
      if (line.stockVariantId) {
        await tx.productVariant.update({
          where: { id: line.stockVariantId },
          data: { stock: { increment: line.quantity } },
        });
      }

      await tx.orderItem.update({
        where: { id: line.orderItemId },
        data: { quantityReturned: { increment: line.quantity } },
      });
    }

    const orderReturn = await tx.orderReturn.create({
      data: {
        returnNumber,
        orderId: order.id,
        refundMethod: data.refundMethod,
        subtotal,
        total,
        notes: data.notes?.trim() || null,
        processedById: data.processedById,
        processedByName: data.processedByName,
        items: {
          create: returnLines.map((line) => ({
            orderItemId: line.orderItemId,
            variantId: line.variantId,
            productName: line.productName,
            variantName: line.variantName,
            sku: line.sku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
          })),
        },
      },
      include: { items: true, order: { select: { orderNumber: true } } },
    });

    const updatedItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
      select: { quantity: true, quantityReturned: true },
    });

    const allReturned = updatedItems.every(
      (i) => i.quantityReturned >= i.quantity,
    );
    const anyReturned = updatedItems.some((i) => i.quantityReturned > 0);

    let nextStatus: OrderStatus = order.status;
    if (allReturned) {
      nextStatus = "REFUNDED";
    } else if (anyReturned) {
      nextStatus = "PARTIALLY_REFUNDED";
    }

    if (nextStatus !== order.status) {
      await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: nextStatus,
          note: `Devolución ${returnNumber}`,
          changedBy: data.processedById,
        },
      });
    }

    return {
      id: orderReturn.id,
      returnNumber: orderReturn.returnNumber,
      orderId: orderReturn.orderId,
      orderNumber: orderReturn.order.orderNumber,
      refundMethod: orderReturn.refundMethod,
      subtotal: Number(orderReturn.subtotal),
      total: Number(orderReturn.total),
      notes: orderReturn.notes,
      processedByName: orderReturn.processedByName,
      createdAt: orderReturn.createdAt.toISOString(),
      items: orderReturn.items.map((i) => ({
        productName: i.productName,
        variantName: i.variantName,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    };
  });
}

export type OrderReturnListFilters = {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
};

/** Día calendario Argentina (UTC-3) → inicio/fin en UTC para Prisma. */
function getArgentinaDayBounds(
  dateStr: string,
): { gte: Date; lte: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T03:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { gte: start, lte: end };
}

export async function listOrderReturns(
  page = 1,
  limit = 20,
  filters: OrderReturnListFilters = {},
) {
  const skip = (page - 1) * limit;
  const q = filters.search?.trim();

  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.dateFrom) {
    const from = getArgentinaDayBounds(filters.dateFrom);
    if (from) createdAt.gte = from.gte;
  }
  if (filters.dateTo) {
    const to = getArgentinaDayBounds(filters.dateTo);
    if (to) createdAt.lte = to.lte;
  }

  const totalFilter: Prisma.DecimalFilter = {};
  if (filters.amountFrom != null && Number.isFinite(filters.amountFrom)) {
    totalFilter.gte = filters.amountFrom;
  }
  if (filters.amountTo != null && Number.isFinite(filters.amountTo)) {
    totalFilter.lte = filters.amountTo;
  }

  const where: Prisma.OrderReturnWhereInput = {
    status: "COMPLETED",
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    ...(Object.keys(totalFilter).length > 0 ? { total: totalFilter } : {}),
    ...(q
      ? {
          OR: [
            { returnNumber: { contains: q, mode: "insensitive" } },
            { order: { orderNumber: { contains: q, mode: "insensitive" } } },
            { processedByName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.orderReturn.findMany({
      where,
      include: {
        order: { select: { orderNumber: true, customerName: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.orderReturn.count({ where }),
  ]);

  return {
    items: items.map((r) => ({
      id: r.id,
      returnNumber: r.returnNumber,
      orderId: r.orderId,
      orderNumber: r.order.orderNumber,
      customerName: r.order.customerName,
      refundMethod: r.refundMethod,
      total: Number(r.total),
      itemCount: r.items.length,
      processedByName: r.processedByName,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function getOrderReturnById(id: string) {
  const orderReturn = await prisma.orderReturn.findUnique({
    where: { id },
    include: {
      items: true,
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          paymentMethod: true,
        },
      },
    },
  });

  if (!orderReturn) return null;

  return {
    id: orderReturn.id,
    returnNumber: orderReturn.returnNumber,
    orderId: orderReturn.orderId,
    orderNumber: orderReturn.order.orderNumber,
    customerName: orderReturn.order.customerName,
    originalPaymentMethod: orderReturn.order.paymentMethod,
    refundMethod: orderReturn.refundMethod,
    subtotal: Number(orderReturn.subtotal),
    total: Number(orderReturn.total),
    notes: orderReturn.notes,
    processedByName: orderReturn.processedByName,
    createdAt: orderReturn.createdAt.toISOString(),
    items: orderReturn.items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
  };
}
