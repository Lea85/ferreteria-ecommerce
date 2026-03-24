import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [featuredProducts, categories, brands] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        include: {
          brand: { select: { name: true } },
          variants: { where: { isActive: true }, select: { price: true, comparePrice: true, stock: true }, orderBy: { price: "asc" }, take: 1 },
          images: { select: { url: true, altText: true }, orderBy: { position: "asc" }, take: 1 },
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),

      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        select: { id: true, name: true, slug: true, imageUrl: true },
        orderBy: { position: "asc" },
        take: 8,
      }),

      prisma.brand.findMany({
        where: { products: { some: { isActive: true } } },
        select: { id: true, name: true, logoUrl: true },
        orderBy: { name: "asc" },
        take: 12,
      }),
    ]);

    const featured = featuredProducts.map((p) => {
      const v = p.variants[0];
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand?.name || null,
        image: p.images[0]?.url || "/placeholder-product.webp",
        price: v ? Number(v.price) : 0,
        comparePrice: v?.comparePrice ? Number(v.comparePrice) : null,
        stock: v?.stock ?? 0,
      };
    });

    const cats = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.imageUrl || "/placeholder-category.webp",
    }));

    const brandList = brands.map((b) => ({
      id: b.id,
      name: b.name,
      logo: b.logoUrl || "/placeholder-brand.webp",
    }));

    return NextResponse.json({ featured, categories: cats, brands: brandList });
  } catch (error) {
    console.error("Home data error:", error);
    return NextResponse.json({ featured: [], categories: [], brands: [] });
  }
}
