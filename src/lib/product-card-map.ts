import type { Prisma } from "@/generated/prisma";

import type { ProductCardProduct } from "@/components/storefront/ProductCard";

export const productCardInclude = {
  brand: { select: { name: true } },
  categories: {
    select: { category: { select: { name: true } } },
    take: 1,
  },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      price: true,
      comparePrice: true,
      stock: true,
    },
    orderBy: { price: "asc" as const },
  },
  images: {
    select: { url: true },
    orderBy: { position: "asc" as const },
    take: 1,
  },
} satisfies Prisma.ProductInclude;

export type ProductForCard = Prisma.ProductGetPayload<{
  include: typeof productCardInclude;
}>;

export function mapProductToCard(p: ProductForCard): ProductCardProduct {
  const v = p.variants[0];
  const prices = p.variants.map((vr) => Number(vr.price));
  const minP = prices.length > 0 ? Math.min(...prices) : 0;
  const maxP = prices.length > 0 ? Math.max(...prices) : 0;
  const totalStock = p.variants.reduce((sum, vr) => sum + vr.stock, 0);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand?.name ?? null,
    category: p.categories[0]?.category?.name ?? null,
    image: p.images[0]?.url ?? null,
    price: minP,
    maxPrice: maxP !== minP ? maxP : null,
    comparePrice: v?.comparePrice ? Number(v.comparePrice) : null,
    stock: totalStock,
    variantCount: p.variants.length,
    defaultVariantId: v?.id,
    defaultSku: v?.sku,
  };
}
