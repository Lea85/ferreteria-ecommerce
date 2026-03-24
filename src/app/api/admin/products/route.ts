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
