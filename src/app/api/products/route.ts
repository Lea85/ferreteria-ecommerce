import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { findProductIdsByTextSearch } from "@/lib/product-search";

type ListingRow = {
  id: string;
  name: string;
  createdAt: Date;
  totalStock: number;
  minPrice: number;
  maxPrice: number;
};

function sortProductsForListing(items: ListingRow[], sort: string) {
  return [...items].sort((a, b) => {
    const aHasStock = a.totalStock > 0 ? 1 : 0;
    const bHasStock = b.totalStock > 0 ? 1 : 0;
    if (aHasStock !== bHasStock) return bHasStock - aHasStock;

    switch (sort) {
      case "price_asc":
        return a.minPrice - b.minPrice;
      case "price_desc":
        return b.minPrice - a.minPrice;
      case "name_asc":
        return a.name.localeCompare(b.name, "es");
      case "name_desc":
        return b.name.localeCompare(a.name, "es");
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category") || "";
    const marcas = searchParams.get("marcas") || "";
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(40, Math.max(1, Number(searchParams.get("limit") || "12")));
    const minPrice = Number(searchParams.get("minPrice") || "0");
    const maxPrice = Number(searchParams.get("maxPrice") || "0");
    const inStock = searchParams.get("inStock") === "true";

    const where: any = { isActive: true };

    if (q) {
      const searchIds = await findProductIdsByTextSearch(q, { onlyActive: true });
      if (searchIds.length === 0) {
        return NextResponse.json({ products: [], total: 0, page, totalPages: 0 });
      }
      where.id = { in: searchIds };
    }

    if (category) {
      where.categories = { some: { category: { slug: category } } };
    }

    if (marcas) {
      const brandNames = marcas.split(",").map((b) => b.trim()).filter(Boolean);
      if (brandNames.length > 0) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          {
            OR: brandNames.map((name) => ({
              brand: { name: { equals: name, mode: "insensitive" } },
            })),
          },
        ];
      }
    }

    if (inStock) {
      where.variants = {
        ...where.variants,
        some: { ...where.variants?.some, stock: { gt: 0 }, isActive: true },
      };
    }

    const candidates = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true,
        variants: {
          where: { isActive: true },
          select: { price: true, stock: true },
        },
      },
    });

    let listingRows: ListingRow[] = candidates.map((p) => {
      const prices = p.variants.map((v) => Number(v.price));
      const minP = prices.length > 0 ? Math.min(...prices) : 0;
      const maxP = prices.length > 0 ? Math.max(...prices) : 0;
      const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
      return {
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        totalStock,
        minPrice: minP,
        maxPrice: maxP,
      };
    });

    if (minPrice > 0) {
      listingRows = listingRows.filter((p) => p.minPrice >= minPrice);
    }
    if (maxPrice > 0) {
      listingRows = listingRows.filter((p) => p.minPrice <= maxPrice);
    }

    const sorted = sortProductsForListing(listingRows, sort);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pageIds = sorted
      .slice((page - 1) * limit, page * limit)
      .map((p) => p.id);

    if (pageIds.length === 0) {
      return NextResponse.json({ products: [], total, page, totalPages });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: pageIds } },
      include: {
        brand: { select: { name: true } },
        categories: {
          select: { category: { select: { name: true, slug: true } } },
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
            name: true,
          },
          orderBy: { price: "asc" },
        },
        images: {
          select: { url: true, altText: true },
          orderBy: { position: "asc" },
          take: 1,
        },
      },
    });

    const byId = new Map(products.map((p) => [p.id, p]));

    const result = pageIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => {
        const v = p.variants[0];
        const prices = p.variants.map((vr) => Number(vr.price));
        const minP = prices.length > 0 ? Math.min(...prices) : 0;
        const maxP = prices.length > 0 ? Math.max(...prices) : 0;
        const totalStock = p.variants.reduce((sum, vr) => sum + vr.stock, 0);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          brand: p.brand?.name || null,
          category: p.categories[0]?.category?.name || null,
          categorySlug: p.categories[0]?.category?.slug || null,
          image: p.images[0]?.url || null,
          price: minP,
          maxPrice: maxP !== minP ? maxP : null,
          comparePrice: v?.comparePrice ? Number(v.comparePrice) : null,
          stock: totalStock,
          variantCount: p.variants.length,
          defaultVariantId: v?.id ?? null,
          defaultSku: v?.sku ?? null,
          isFeatured: p.isFeatured,
        };
      });

    return NextResponse.json({ products: result, total, page, totalPages });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json({ products: [], total: 0, page: 1, totalPages: 0 });
  }
}
