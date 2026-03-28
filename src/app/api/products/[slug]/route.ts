import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        brand: { select: { name: true } },
        categories: { select: { category: { select: { name: true, slug: true } } } },
        variants: {
          where: { isActive: true },
          select: {
            id: true, name: true, sku: true, price: true, comparePrice: true, stock: true,
            attributes: {
              select: {
                attributeValue: {
                  select: { id: true, value: true, attribute: { select: { id: true, name: true } } },
                },
              },
            },
          },
          orderBy: { price: "asc" },
        },
        images: { select: { url: true, altText: true }, orderBy: { position: "asc" } },
      },
    });

    if (!product) {
      return NextResponse.json({ product: null }, { status: 404 });
    }

    const related = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        categories: {
          some: { categoryId: { in: product.categories.map((c) => c.category.slug).length > 0 ? (await prisma.category.findMany({ where: { slug: { in: product.categories.map((c) => c.category.slug) } }, select: { id: true } })).map((c) => c.id) : [] } },
        },
      },
      include: {
        brand: { select: { name: true } },
        variants: { where: { isActive: true }, select: { price: true, comparePrice: true, stock: true }, orderBy: { price: "asc" }, take: 1 },
        images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
      },
      take: 4,
    });

    const mapped = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      brand: product.brand?.name || null,
      category: product.categories[0]?.category?.name || null,
      images: product.images.map((i) => i.url),
      image: product.images[0]?.url || "/placeholder-product.webp",
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: Number(v.price),
        comparePrice: v.comparePrice ? Number(v.comparePrice) : undefined,
        stock: v.stock,
        attributes: v.attributes.map((a) => ({
          typeId: a.attributeValue.attribute.id,
          typeName: a.attributeValue.attribute.name,
          valueId: a.attributeValue.id,
          value: a.attributeValue.value,
        })),
      })),
      specs: [] as { label: string; value: string }[],
      rating: 0,
      reviewCount: 0,
      complementary: related.map((r) => {
        const rv = r.variants[0];
        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          brand: r.brand?.name || null,
          image: r.images[0]?.url || "/placeholder-product.webp",
          price: rv ? Number(rv.price) : 0,
          comparePrice: rv?.comparePrice ? Number(rv.comparePrice) : undefined,
          stock: rv?.stock ?? 0,
        };
      }),
    };

    return NextResponse.json({ product: mapped });
  } catch (error) {
    console.error("Product detail error:", error);
    return NextResponse.json({ product: null }, { status: 500 });
  }
}
