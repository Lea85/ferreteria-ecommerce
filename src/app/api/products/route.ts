import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
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
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
      ];
    }

    if (category) {
      where.categories = { some: { category: { slug: category } } };
    }

    if (marcas) {
      const brandNames = marcas.split(",").map((b) => b.trim());
      where.brand = { name: { in: brandNames } };
    }

    if (inStock) {
      where.variants = { ...where.variants, some: { ...where.variants?.some, stock: { gt: 0 }, isActive: true } };
    }

    const orderBy: any = (() => {
      switch (sort) {
        case "price_asc": return { name: "asc" };
        case "price_desc": return { name: "desc" };
        case "name_asc": return { name: "asc" };
        case "name_desc": return { name: "desc" };
        default: return { createdAt: "desc" };
      }
    })();

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand: { select: { name: true } },
          categories: { select: { category: { select: { name: true, slug: true } } }, take: 1 },
          variants: { where: { isActive: true }, select: { id: true, sku: true, price: true, comparePrice: true, stock: true, name: true }, orderBy: { price: "asc" } },
          images: { select: { url: true, altText: true }, orderBy: { position: "asc" }, take: 1 },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const mapped = products.map((p) => {
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
        isFeatured: p.isFeatured,
      };
    });

    let result = mapped;

    if (minPrice > 0) result = result.filter((p) => p.price >= minPrice);
    if (maxPrice > 0) result = result.filter((p) => p.price <= maxPrice);

    if (sort === "price_asc") result.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") result.sort((a, b) => b.price - a.price);

    return NextResponse.json({ products: result, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json({ products: [], total: 0, page: 1, totalPages: 0 });
  }
}
