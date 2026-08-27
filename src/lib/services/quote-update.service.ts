import { prisma } from "@/lib/db";
import { resolveUserCategoryDiscount } from "@/lib/services/customer-discount.service";

export type QuoteUpdateItemInput = {
  variantId: string;
  quantity: number;
  unitPrice?: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function updateQuoteItems(
  quoteId: string,
  rawItems: QuoteUpdateItemInput[],
  options?: { userId?: string | null },
) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, userId: true, status: true },
  });

  if (!quote) {
    throw new Error("Presupuesto no encontrado.");
  }
  if (quote.status !== "ACTIVE") {
    throw new Error("Solo se pueden editar presupuestos activos.");
  }

  let userId = quote.userId;
  const nextUserId = options?.userId?.trim();
  if (nextUserId && nextUserId !== quote.userId) {
    const customer = await prisma.user.findUnique({
      where: { id: nextUserId },
      select: { id: true },
    });
    if (!customer) {
      throw new Error("Cliente no encontrado.");
    }
    userId = customer.id;
  }

  const byVariant = new Map<string, number>();
  for (const raw of rawItems) {
    const variantId = String(raw.variantId ?? "").trim();
    if (!variantId) continue;
    const qty = Math.floor(Number(raw.quantity));
    if (!Number.isFinite(qty) || qty < 1) continue;
    byVariant.set(variantId, (byVariant.get(variantId) ?? 0) + qty);
  }

  if (byVariant.size === 0) {
    throw new Error("El presupuesto debe tener al menos un producto.");
  }

  const variantIds = [...byVariant.keys()];
  const variants = await prisma.productVariant.findMany({
    where: {
      id: { in: variantIds },
      isActive: true,
      product: { isActive: true },
    },
    include: {
      product: { select: { name: true } },
    },
  });

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const missing = variantIds.filter((id) => !variantMap.has(id));
  if (missing.length > 0) {
    throw new Error("Hay productos inválidos o inactivos en el presupuesto.");
  }

  const priceByVariant = new Map<string, number>();
  for (const raw of rawItems) {
    const variantId = String(raw.variantId ?? "").trim();
    if (!variantId || priceByVariant.has(variantId)) continue;
    const parsed = Number(raw.unitPrice);
    if (Number.isFinite(parsed) && parsed >= 0) {
      priceByVariant.set(variantId, roundMoney(parsed));
    }
  }

  let subtotal = 0;
  const quoteItems: {
    variantId: string;
    productName: string;
    variantName: string | null;
    sku: string;
    ean: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[] = [];

  for (const [variantId, quantity] of byVariant) {
    const variant = variantMap.get(variantId)!;
    const unitPrice =
      priceByVariant.get(variantId) ?? roundMoney(Number(variant.price));
    const lineSubtotal = roundMoney(unitPrice * quantity);
    quoteItems.push({
      variantId: variant.id,
      productName: variant.product.name,
      variantName: variant.name,
      sku: variant.sku,
      ean: variant.ean,
      quantity,
      unitPrice,
      subtotal: lineSubtotal,
    });
    subtotal += lineSubtotal;
  }

  subtotal = roundMoney(subtotal);
  const totalQuantity = quoteItems.reduce((sum, i) => sum + i.quantity, 0);
  const categoryDiscount = await resolveUserCategoryDiscount(
    userId,
    subtotal,
    totalQuantity,
  );
  const discountAmount = categoryDiscount?.amount ?? 0;
  const total = roundMoney(Math.max(0, subtotal - discountAmount));

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId } });
    return tx.quote.update({
      where: { id: quoteId },
      data: {
        userId,
        subtotal,
        total,
        notes: categoryDiscount
          ? `${categoryDiscount.label}: -${discountAmount.toFixed(2)}`
          : null,
        items: {
          create: quoteItems,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            phone: true,
            taxId: true,
            taxIdType: true,
            companyName: true,
          },
        },
        items: {
          include: {
            variant: { select: { stock: true, isActive: true } },
          },
        },
      },
    });
  });

  return updated;
}
