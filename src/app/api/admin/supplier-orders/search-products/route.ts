import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth, isAdminRole } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdminRole((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const supplierId = searchParams.get("supplierId")?.trim() || null;

    if (q.length < 2) {
      return NextResponse.json({ products: [] });
    }

    const productFilter: Prisma.ProductWhereInput = {
      isActive: true,
      ...(supplierId
        ? { suppliers: { some: { supplierId } } }
        : {}),
    };

    const variants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: productFilter,
        OR: [
          { sku: { contains: q, mode: "insensitive" } },
          { product: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 20,
      orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
      select: {
        id: true,
        sku: true,
        stock: true,
        price: true,
        costPrice: true,
        lowStockThreshold: true,
        productId: true,
        product: { select: { name: true } },
      },
    });

    return NextResponse.json({
      products: variants.map((v) => ({
        variantId: v.id,
        productId: v.productId,
        productName: v.product.name,
        sku: v.sku,
        currentStock: v.stock,
        costPrice: v.costPrice != null ? Number(v.costPrice) : 0,
        salePrice: Number(v.price),
        suggestedQty: Math.max(1, v.lowStockThreshold - v.stock),
      })),
    });
  } catch (error) {
    console.error("Supplier order search-products error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
