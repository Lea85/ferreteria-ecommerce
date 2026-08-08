import type { OrderStatus, PaymentMethod, ShippingMethod } from "@/generated/prisma";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveUserCategoryDiscount } from "@/lib/services/customer-discount.service";
import { createUserAddress } from "@/lib/services/user-address.service";

export type CheckoutCartItem = {
  productId?: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
};

export type CheckoutContactData = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
};

export type CheckoutBillingData = {
  nombre: string;
  apellido: string;
  doc: string;
  condicionFiscal: string;
};

export type CheckoutShippingAddressInput = {
  addressId?: string;
  calle?: string | null;
  piso?: string | null;
  cp?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  street?: string;
  number?: string;
  label?: string;
  instructions?: string | null;
  saveToProfile?: boolean;
  setAsDefault?: boolean;
} | null;

export type CreateCheckoutOrderInput = {
  paymentMethod: PaymentMethod | string;
  shippingMethod: ShippingMethod | string;
  contactData: CheckoutContactData;
  billingData: CheckoutBillingData;
  shippingAddress: CheckoutShippingAddressInput;
  items: CheckoutCartItem[];
  subtotal: number;
  status?: OrderStatus;
  paymentExternalId?: string | null;
  paymentStatus?: string | null;
};

export class CheckoutOrderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function createCheckoutOrder(input: CreateCheckoutOrderInput) {
  const {
    paymentMethod,
    shippingMethod,
    contactData,
    billingData,
    shippingAddress,
    items,
    subtotal,
    status = "PENDING",
    paymentExternalId = null,
    paymentStatus = null,
  } = input;

  if (!items?.length) {
    throw new CheckoutOrderError("El carrito esta vacio.");
  }

  const session = await auth();

  const variantIds = items
    .map((i) => i.variantId)
    .filter((id): id is string => Boolean(id));

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, stock: true, sku: true, product: { select: { name: true } } },
  });
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  for (const item of items) {
    const variantId = item.variantId;
    const qty = Number(item.quantity) || 0;
    if (!variantId) {
      throw new CheckoutOrderError("Item de carrito invalido.");
    }
    const variant = variantMap.get(variantId);
    if (!variant) {
      throw new CheckoutOrderError(
        `Variante no encontrada (${item.name ?? variantId}).`,
      );
    }
    if (qty < 1) {
      throw new CheckoutOrderError("Cantidad invalida.");
    }
    if (qty > variant.stock) {
      throw new CheckoutOrderError(
        `Stock insuficiente para "${variant.product.name}" (SKU ${variant.sku}). Disponible: ${variant.stock}.`,
      );
    }
  }

  const totalQuantity = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0),
    0,
  );
  const categoryDiscount = await resolveUserCategoryDiscount(
    session?.user?.id ?? null,
    subtotal,
    totalQuantity,
  );
  const discountTotal = categoryDiscount?.amount ?? 0;
  const orderTotal = Math.max(0, subtotal - discountTotal);

  let shippingAddressId: string | null = shippingAddress?.addressId ?? null;

  if (
    shippingMethod === "OWN_DELIVERY" &&
    shippingAddress?.saveToProfile &&
    !shippingAddressId
  ) {
    const { getAuthenticatedUserId } = await import("@/lib/user-session");
    const userId = await getAuthenticatedUserId();
    if (userId && shippingAddress.street && shippingAddress.localidad) {
      const saved = await createUserAddress(userId, {
        label: shippingAddress.label?.trim() || "Envío",
        street: String(shippingAddress.street).trim(),
        number: String(shippingAddress.number || "S/N").trim(),
        floor: shippingAddress.piso?.trim() || null,
        apartment: null,
        city: shippingAddress.localidad?.trim() || "",
        state: shippingAddress.provincia?.trim() || "",
        postalCode: shippingAddress.cp?.trim() || "",
        country: "AR",
        instructions: shippingAddress.instructions?.trim() || null,
        isDefault: Boolean(shippingAddress.setAsDefault),
      });
      shippingAddressId = saved.id;
    }
  }

  const orderNumber = `FS-${Date.now().toString(36).toUpperCase()}`;

  const order = await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.variantId) continue;
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: Number(item.quantity) } },
      });
    }

    return tx.order.create({
      data: {
        orderNumber,
        userId: session?.user?.id || null,
        status,
        paymentMethod: paymentMethod as PaymentMethod,
        shippingMethod: shippingMethod as ShippingMethod,
        subtotal,
        shippingCost: 0,
        discountTotal,
        total: orderTotal,
        customerName: `${contactData.nombre} ${contactData.apellido}`,
        customerEmail: contactData.email,
        customerPhone: contactData.telefono,
        billingName: `${billingData.nombre} ${billingData.apellido}`,
        billingDoc: billingData.doc,
        billingTaxCondition: billingData.condicionFiscal,
        shippingAddressId,
        shippingStreet: shippingAddress?.calle || null,
        shippingFloor: shippingAddress?.piso || null,
        shippingZip: shippingAddress?.cp || null,
        shippingCity: shippingAddress?.localidad || null,
        shippingState: shippingAddress?.provincia || null,
        paymentExternalId,
        paymentStatus,
        items: {
          create: items.map((i) => ({
            productId: i.productId || null,
            variantId: i.variantId || null,
            productName: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
            subtotal: i.price * i.quantity,
          })),
        },
      },
    });
  });

  return order;
}
