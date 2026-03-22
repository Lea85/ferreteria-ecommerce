import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/db";

export class InsufficientStockError extends Error {
  constructor(
    message = "Stock insuficiente para completar la operación.",
  ) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export async function checkStock(
  variantId: string,
  quantity: number,
): Promise<{ ok: boolean; available: number }> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true },
  });

  if (!variant) {
    return { ok: false, available: 0 };
  }

  return {
    ok: variant.stock >= quantity,
    available: variant.stock,
  };
}

export async function reserveStock(
  variantId: string,
  quantity: number,
): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true, isActive: true },
    });

    if (!variant?.isActive) {
      throw new InsufficientStockError("La variante no está disponible.");
    }

    if (variant.stock < quantity) {
      throw new InsufficientStockError();
    }

    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { decrement: quantity } },
    });
  });
}

export async function releaseStock(
  variantId: string,
  quantity: number,
): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { increment: quantity } },
    });
  });
}

export type LowStockProductRow = {
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
};

/**
 * Variantes con stock en o por debajo del umbral configurado.
 */
export async function getLowStockProducts(): Promise<LowStockProductRow[]> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const variants = await tx.productVariant.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    return variants
      .filter(
        (v: (typeof variants)[number]) => v.stock <= v.lowStockThreshold,
      )
      .map((v: (typeof variants)[number]) => ({
        productId: v.product.id,
        productName: v.product.name,
        productSlug: v.product.slug,
        variantId: v.id,
        sku: v.sku,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
      }));
  });
}
