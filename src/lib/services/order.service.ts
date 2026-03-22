import { prisma } from "@/lib/db";
import { ORDER_PREFIX } from "@/lib/constants";

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${ORDER_PREFIX}-${year}-`;

  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  let sequence = 1;
  if (lastOrder) {
    const lastNum = parseInt(lastOrder.orderNumber.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) {
      sequence = lastNum + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(6, "0")}`;
}

export async function getOrdersByUser(
  userId: string,
  page = 1,
  limit = 10,
) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true, slug: true } },
            },
          },
        },
      },
      statusHistory: { orderBy: { createdAt: "desc" } },
      coupon: true,
      user: {
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          phone: true,
          customerType: true,
        },
      },
      shippingAddress: true,
    },
  });
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  adminId?: string,
  note?: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus as never },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus as never,
        changedBy: adminId,
        note,
      },
    });

    return updated;
  });
}

export async function createOrder(data: {
  userId: string;
  customerType: string;
  shippingMethod: string;
  paymentMethod: string;
  shippingAddressId?: string;
  shippingName?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingPhone?: string;
  billingTaxIdType?: string;
  billingTaxId?: string;
  billingName?: string;
  billingCompany?: string;
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  taxTotal: number;
  total: number;
  couponId?: string;
  couponCode?: string;
  couponDiscount?: number;
  notes?: string;
  items: Array<{
    variantId: string;
    productName: string;
    variantName?: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    originalPrice: number;
    discount: number;
    total: number;
    appliedRules?: string;
  }>;
}) {
  const orderNumber = await generateOrderNumber();

  return prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: item.variantId },
        select: { stock: true },
      });

      if (variant.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${item.productName} (SKU: ${item.sku})`);
      }

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: data.userId,
        status: "PENDING",
        customerType: data.customerType as never,
        shippingMethod: data.shippingMethod as never,
        paymentMethod: data.paymentMethod as never,
        shippingAddressId: data.shippingAddressId,
        shippingName: data.shippingName,
        shippingStreet: data.shippingStreet,
        shippingCity: data.shippingCity,
        shippingState: data.shippingState,
        shippingPostalCode: data.shippingPostalCode,
        shippingPhone: data.shippingPhone,
        billingTaxIdType: data.billingTaxIdType,
        billingTaxId: data.billingTaxId,
        billingName: data.billingName,
        billingCompany: data.billingCompany,
        subtotal: data.subtotal,
        discountTotal: data.discountTotal,
        shippingCost: data.shippingCost,
        taxTotal: data.taxTotal,
        total: data.total,
        couponId: data.couponId,
        couponCode: data.couponCode,
        couponDiscount: data.couponDiscount,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            originalPrice: item.originalPrice,
            discount: item.discount,
            subtotal: item.total,
            appliedRules: item.appliedRules,
          })),
        },
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: "PENDING",
          },
        },
      },
      include: {
        items: true,
      },
    });

    if (data.couponId) {
      await tx.coupon.update({
        where: { id: data.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return order;
  });
}
