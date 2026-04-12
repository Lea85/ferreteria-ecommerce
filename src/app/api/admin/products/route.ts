import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryParam = searchParams.get("category")?.trim();
    const brandParam = searchParams.get("brand")?.trim();
    const active = searchParams.get("active") ?? "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
    );

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    if (active === "true") {
      where.isActive = true;
    } else if (active === "false") {
      where.isActive = false;
    }

    if (categoryParam) {
      const cat = await prisma.category.findFirst({
        where: {
          OR: [{ id: categoryParam }, { slug: categoryParam }],
        },
        select: { id: true },
      });
      if (cat) {
        where.categories = { some: { categoryId: cat.id } };
      } else {
        return NextResponse.json({
          products: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
    }

    if (brandParam) {
      const brand = await prisma.brand.findFirst({
        where: {
          OR: [{ id: brandParam }, { slug: brandParam }],
        },
        select: { id: true },
      });
      if (brand) {
        where.brandId = brand.id;
      } else {
        return NextResponse.json({
          products: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
    }

    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          isFeatured: true,
          createdAt: true,
          brand: { select: { name: true } },
          categories: {
            take: 1,
            orderBy: { category: { name: "asc" } },
            select: { category: { select: { name: true } } },
          },
          variants: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: {
              sku: true,
              price: true,
              stock: true,
              isActive: true,
            },
          },
          images: {
            take: 1,
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            select: { url: true },
          },
        },
      }),
    ]);

    const products = rows.map((p) => {
      const v = p.variants[0];
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        brand: p.brand ? { name: p.brand.name } : null,
        categories: p.categories[0]?.category?.name ?? null,
        variants: v
          ? {
              sku: v.sku,
              price: Number(v.price),
              stock: v.stock,
              isActive: v.isActive,
            }
          : null,
        images: p.images[0]?.url ?? null,
        createdAt: p.createdAt,
      };
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json({
      products,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Admin products GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }
    if (!body.slug?.trim()) {
      return NextResponse.json({ error: "El slug es obligatorio" }, { status: 400 });
    }
    if (!body.variants || body.variants.length === 0) {
      return NextResponse.json({ error: "Debe tener al menos una variante" }, { status: 400 });
    }

    const existingSlug = await prisma.product.findUnique({
      where: { slug: body.slug.trim() },
      select: { id: true },
    });
    if (existingSlug) {
      return NextResponse.json({ error: "Ya existe un producto con ese slug" }, { status: 409 });
    }

    const product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim(),
        description: body.description || null,
        brandId: body.brandId || null,
        warehouseLocationId: body.warehouseLocationId || null,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        metaTitle: body.metaTitle || null,
        metaDesc: body.metaDesc || null,
        categories: {
          create: (body.categoryIds || []).map((catId: string) => ({
            categoryId: catId,
          })),
        },
        variants: {
          create: body.variants.map((v: any) => ({
            sku: v.sku,
            ean: v.ean || null,
            name: v.name || null,
            price: v.price ?? 0,
            comparePrice: v.comparePrice || null,
            stock: v.stock ?? 0,
            weight: v.weight || null,
          })),
        },
      },
      include: {
        variants: { select: { id: true, sku: true } },
      },
    });

    if (body.variants) {
      for (let i = 0; i < body.variants.length; i++) {
        const v = body.variants[i];
        if (Array.isArray(v.attributeValueIds) && v.attributeValueIds.length > 0 && product.variants[i]) {
          await prisma.variantAttributeValue.createMany({
            data: v.attributeValueIds.map((avId: string) => ({
              variantId: product.variants[i].id,
              attributeValueId: avId,
            })),
          });
        }
      }
    }

    if (body.supplierIds && Array.isArray(body.supplierIds) && body.supplierIds.length > 0) {
      await prisma.productSupplier.createMany({
        data: body.supplierIds.map((sid: string) => ({
          productId: product.id,
          supplierId: sid,
        })),
      });
    }

    if (body.images && Array.isArray(body.images) && body.images.length > 0) {
      await prisma.productImage.createMany({
        data: body.images.map((img: { url: string; altText?: string }, idx: number) => ({
          productId: product.id,
          url: img.url,
          altText: img.altText || null,
          position: idx,
          isPrimary: idx === 0,
        })),
      });
    }

    return NextResponse.json({ success: true, id: product.id, slug: body.slug });
  } catch (error) {
    console.error("Admin product CREATE error:", error);
    return NextResponse.json({ error: "Error al crear el producto" }, { status: 500 });
  }
}
