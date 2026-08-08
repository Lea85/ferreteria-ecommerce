import { NextResponse } from "next/server";

import { auth, isFullAdmin } from "@/lib/auth";
import {
  buildAdminProductsWhere,
  parseAdminProductsFilterParams,
} from "@/lib/admin-products-filters";
import { prisma } from "@/lib/db";
import { normalizeProductCode } from "@/lib/product-search";
import type { Prisma } from "@/generated/prisma";

function variantDescription(
  productName: string,
  variantName: string | null,
): string {
  if (variantName?.trim()) {
    return `${productName} — ${variantName.trim()}`;
  }
  return productName;
}

function buildVariantSearchFilter(
  search: string,
): Prisma.ProductVariantWhereInput | undefined {
  const q = search.trim();
  if (!q) return undefined;

  const normalized = normalizeProductCode(q);
  const or: Prisma.ProductVariantWhereInput[] = [
    { sku: { contains: q, mode: "insensitive" } },
    { ean: { contains: q, mode: "insensitive" } },
    { barcode: { contains: q, mode: "insensitive" } },
    { name: { contains: q, mode: "insensitive" } },
    { product: { name: { contains: q, mode: "insensitive" } } },
  ];

  if (normalized.length >= 2 && normalized !== q.toLowerCase()) {
    or.push({ sku: { contains: normalized, mode: "insensitive" } });
    or.push({ ean: { contains: normalized, mode: "insensitive" } });
  }

  return { OR: or };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || !isFullAdmin(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50),
    );

    const filterParams = parseAdminProductsFilterParams(searchParams);
    const search = filterParams.search?.trim() || "";

    // Brand/supplier/active filters at product level; SKU/text search at variant level
    // so suffix searches like "rf-100" hit the matching variants directly.
    const productWhere = await buildAdminProductsWhere({
      ...filterParams,
      search: undefined,
      active: "all",
    });

    if (productWhere === null) {
      return NextResponse.json({
        rows: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }

    const variantSearch = buildVariantSearchFilter(search);
    const where: Prisma.ProductVariantWhereInput = {
      ...(Object.keys(productWhere).length > 0
        ? { product: productWhere }
        : {}),
      ...(variantSearch ?? {}),
    };

    const [total, variants] = await Promise.all([
      prisma.productVariant.count({ where }),
      prisma.productVariant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
        select: {
          id: true,
          sku: true,
          ean: true,
          name: true,
          price: true,
          costPrice: true,
          product: { select: { id: true, name: true } },
        },
      }),
    ]);

    const rows = variants.map((v) => ({
      id: v.id,
      variantId: v.id,
      productId: v.product.id,
      sku: v.sku,
      ean: v.ean,
      description: variantDescription(v.product.name, v.name),
      costPrice: v.costPrice != null ? Number(v.costPrice) : null,
      price: Number(v.price),
    }));

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json({ rows, total, page, totalPages });
  } catch (error) {
    console.error("Price update catalog GET:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || !isFullAdmin(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const variantId = String(body.variantId ?? "").trim();
    if (!variantId) {
      return NextResponse.json({ error: "variantId requerido" }, { status: 400 });
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, sku: true },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 });
    }

    const data: { price?: number; costPrice?: number | null } = {};

    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: "Precio de venta inválido" }, { status: 400 });
      }
      data.price = price;
    }

    if (body.costPrice !== undefined) {
      if (body.costPrice === null) {
        data.costPrice = null;
      } else {
        const costPrice = Number(body.costPrice);
        if (!Number.isFinite(costPrice) || costPrice < 0) {
          return NextResponse.json(
            { error: "Precio de compra inválido" },
            { status: 400 },
          );
        }
        data.costPrice = costPrice;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin cambios para aplicar" }, { status: 400 });
    }

    await prisma.productVariant.update({
      where: { id: variantId },
      data,
    });

    return NextResponse.json({ success: true, sku: variant.sku });
  } catch (error) {
    console.error("Price update POST:", error);
    return NextResponse.json({ error: "Error al actualizar precio" }, { status: 500 });
  }
}
