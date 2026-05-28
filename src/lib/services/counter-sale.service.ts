import type { PaymentMethod } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/services/order.service";

export type CounterSaleItemInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
};

const COUNTER_PAYMENT_METHODS: PaymentMethod[] = [
  "COUNTER_CASH",
  "COUNTER_CREDIT_CARD",
  "COUNTER_DEBIT_CARD",
  "COUNTER_TRANSFER",
];

export function isCounterPaymentMethod(value: string): value is PaymentMethod {
  return COUNTER_PAYMENT_METHODS.includes(value as PaymentMethod);
}

const LEGACY_DEFAULT_SUFFIX = "-default";

/** IDs legacy del listado (`{productId}-default`) → variante real en BD. */
async function resolveVariantIds(
  items: CounterSaleItemInput[],
): Promise<CounterSaleItemInput[]> {
  const resolved: CounterSaleItemInput[] = [];

  for (const item of items) {
    if (!item.variantId.endsWith(LEGACY_DEFAULT_SUFFIX)) {
      resolved.push(item);
      continue;
    }

    const productId = item.variantId.slice(0, -LEGACY_DEFAULT_SUFFIX.length);
    const variant = await prisma.productVariant.findFirst({
      where: { productId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (!variant) {
      throw new Error(
        `No se encontró variante para el producto en el carrito. Volvé a agregar el ítem desde el catálogo.`,
      );
    }

    resolved.push({ ...item, variantId: variant.id });
  }

  return resolved;
}

export async function createCounterSaleOrder(data: {
  adminUserId: string;
  adminName: string;
  paymentMethod: PaymentMethod;
  items: CounterSaleItemInput[];
}) {
  if (data.items.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  const orderNumber = await generateOrderNumber();
  const resolvedItems = await resolveVariantIds(data.items);
  const variantIds = resolvedItems.map((i) => i.variantId);

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: { select: { id: true, name: true, isActive: true } },
    },
  });

  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const orderItems: {
    variantId: string;
    productId: string;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[] = [];

  let subtotal = 0;

  for (const item of resolvedItems) {
    const variant = variantMap.get(item.variantId);
    if (!variant) {
      throw new Error(`Variante no encontrada.`);
    }
    if (!variant.product.isActive) {
      throw new Error(`El producto "${variant.product.name}" no está activo.`);
    }
    if (variant.stock < item.quantity) {
      throw new Error(
        `Stock insuficiente para "${variant.product.name}" (disponible: ${variant.stock}).`,
      );
    }

    const lineSubtotal = item.unitPrice * item.quantity;
    subtotal += lineSubtotal;

    orderItems.push({
      variantId: variant.id,
      productId: variant.product.id,
      productName: variant.product.name,
      variantName: variant.name,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: lineSubtotal,
    });
  }

  return prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: data.adminUserId,
        status: "PAYMENT_APPROVED",
        customerType: "CONSUMER",
        shippingMethod: "STORE_PICKUP",
        paymentMethod: data.paymentMethod,
        customerName: "Venta mostrador",
        customerEmail: null,
        customerPhone: null,
        billingName: "Consumidor final",
        subtotal,
        discountTotal: 0,
        shippingCost: 0,
        taxTotal: 0,
        total: subtotal,
        notes: `Compra mostrador — operador: ${data.adminName}`,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            originalPrice: item.unitPrice,
            subtotal: item.subtotal,
            discount: 0,
          })),
        },
        statusHistory: {
          create: [
            {
              fromStatus: null,
              toStatus: "PENDING",
              note: "Venta mostrador iniciada",
              changedBy: data.adminUserId,
            },
            {
              fromStatus: "PENDING",
              toStatus: "PAYMENT_APPROVED",
              note: "Pago confirmado en mostrador",
              changedBy: data.adminUserId,
            },
          ],
        },
      },
      include: {
        items: {
          select: {
            productName: true,
            variantName: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
          },
        },
      },
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
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
