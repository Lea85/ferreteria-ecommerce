import { NextResponse } from "next/server";

import { auth, isFullAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import {
  normalizeBulkProductRows,
  parseCategoryNames,
  type NormalizedBulkProductRow,
} from "@/lib/bulk-products-spreadsheet";

type BulkResults = {
  created: number;
  updated: number;
  errors: string[];
  warnings: string[];
};

function toNumberOrUndefined(value: string | number | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadLookupMaps() {
  const [suppliers, categories] = await Promise.all([
    prisma.supplier.findMany({ select: { id: true, name: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  const supplierByName = new Map(
    suppliers.map((s) => [s.name.trim().toLowerCase(), s.id]),
  );
  const categoryByName = new Map(
    categories.map((c) => [c.name.trim().toLowerCase(), c.id]),
  );

  return { supplierByName, categoryByName };
}

function resolveSupplier(
  name: string | undefined,
  supplierByName: Map<string, string>,
  sku: string,
  warnings: string[],
): string | null {
  if (!name?.trim()) return null;
  const id = supplierByName.get(name.trim().toLowerCase());
  if (!id) {
    warnings.push(
      `SKU ${sku}: no quedó asociado el proveedor "${name}" porque no existía en la base de datos.`,
    );
    return null;
  }
  return id;
}

function resolveCategories(
  raw: string | undefined,
  categoryByName: Map<string, string>,
  sku: string,
  warnings: string[],
): string[] {
  const names = parseCategoryNames(raw);
  if (names.length === 0) return [];

  const ids: string[] = [];
  for (const name of names) {
    const id = categoryByName.get(name.toLowerCase());
    if (id) {
      ids.push(id);
    } else {
      warnings.push(
        `SKU ${sku}: no quedó asociada la categoría "${name}" porque no existía en la base de datos.`,
      );
    }
  }
  return ids;
}

async function upsertBrandId(brandName?: string): Promise<string | null> {
  if (!brandName?.trim()) return null;
  const slug = slugify(brandName);
  const brand = await prisma.brand.upsert({
    where: { slug },
    update: {},
    create: { name: brandName.trim(), slug },
  });
  return brand.id;
}

async function applySupplier(
  productId: string,
  supplierId: string | null,
  supplierName: string | undefined,
) {
  if (!supplierName?.trim()) return;
  await prisma.productSupplier.deleteMany({ where: { productId } });
  if (supplierId) {
    await prisma.productSupplier.create({
      data: { productId, supplierId },
    });
  }
}

async function applyCategories(productId: string, categoryIds: string[]) {
  if (categoryIds.length === 0) return;
  await prisma.productCategory.deleteMany({ where: { productId } });
  await prisma.productCategory.createMany({
    data: categoryIds.map((categoryId) => ({ productId, categoryId })),
    skipDuplicates: true,
  });
}

async function importProduct(
  p: NormalizedBulkProductRow,
  ctx: {
    supplierByName: Map<string, string>;
    categoryByName: Map<string, string>;
    results: BulkResults;
  },
) {
  if (!p.name?.trim() || !p.sku) {
    ctx.results.errors.push(
      `Fila sin nombre o SKU: ${JSON.stringify(p).slice(0, 100)}`,
    );
    return;
  }

  const existing = await prisma.product.findFirst({
    where: { variants: { some: { sku: p.sku } } },
    select: { id: true, name: true },
  });

  if (existing) {
    ctx.results.errors.push(`SKU ${p.sku} ya existe (${existing.name})`);
    return;
  }

  const brandId = await upsertBrandId(p.brand);
  const supplierId = resolveSupplier(
    p.supplier,
    ctx.supplierByName,
    p.sku,
    ctx.results.warnings,
  );
  const categoryIds = resolveCategories(
    p.categories,
    ctx.categoryByName,
    p.sku,
    ctx.results.warnings,
  );

  const slug = slugify(p.name);
  const product = await prisma.product.create({
    data: {
      name: p.name.trim(),
      slug,
      description: p.description || "",
      shortDesc: p.shortDesc || "",
      brandId,
      metaTitle: `${p.name.trim()} | FerroSan`,
      metaDesc: p.shortDesc || p.name.trim(),
      variants: {
        create: [
          {
            sku: p.sku,
            ean: p.ean ? String(p.ean) : null,
            price: toNumberOrUndefined(p.price) ?? 0,
            costPrice: toNumberOrUndefined(p.costPrice) ?? null,
            comparePrice: toNumberOrUndefined(p.comparePrice) ?? null,
            stock: toNumberOrUndefined(p.stock) ?? 0,
          },
        ],
      },
    },
  });

  if (supplierId) {
    await prisma.productSupplier.create({
      data: { productId: product.id, supplierId },
    });
  }

  if (categoryIds.length > 0) {
    await prisma.productCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        productId: product.id,
        categoryId,
      })),
    });
  }

  ctx.results.created++;
}

async function updateProduct(
  p: NormalizedBulkProductRow,
  ctx: {
    supplierByName: Map<string, string>;
    categoryByName: Map<string, string>;
    results: BulkResults;
  },
) {
  if (!p.sku) {
    ctx.results.errors.push("Fila sin SKU, no se puede actualizar");
    return;
  }

  const variant = await prisma.productVariant.findUnique({
    where: { sku: p.sku },
    select: { id: true, productId: true },
  });

  if (!variant) {
    ctx.results.errors.push(`SKU ${p.sku} no encontrado`);
    return;
  }

  const variantData: Record<string, unknown> = {};
  const price = toNumberOrUndefined(p.price);
  const costPrice = toNumberOrUndefined(p.costPrice);
  const comparePrice = toNumberOrUndefined(p.comparePrice);
  const stock = toNumberOrUndefined(p.stock);

  if (price !== undefined) variantData.price = price;
  if (costPrice !== undefined) variantData.costPrice = costPrice;
  if (comparePrice !== undefined) variantData.comparePrice = comparePrice;
  if (stock !== undefined) variantData.stock = stock;
  if (p.ean !== undefined && String(p.ean).trim() !== "") {
    variantData.ean = String(p.ean).trim();
  }

  if (Object.keys(variantData).length > 0) {
    await prisma.productVariant.update({
      where: { sku: p.sku },
      data: variantData,
    });
  }

  const productData: Record<string, unknown> = {};
  if (p.name?.trim()) productData.name = p.name.trim();
  if (p.description !== undefined) productData.description = p.description;
  if (p.shortDesc !== undefined) productData.shortDesc = p.shortDesc;

  if (p.brand !== undefined && p.brand.trim()) {
    productData.brandId = await upsertBrandId(p.brand);
  }

  if (Object.keys(productData).length > 0) {
    await prisma.product.update({
      where: { id: variant.productId },
      data: productData,
    });
  }

  if (p.supplier !== undefined) {
    const supplierId = resolveSupplier(
      p.supplier,
      ctx.supplierByName,
      p.sku,
      ctx.results.warnings,
    );
    await applySupplier(variant.productId, supplierId, p.supplier);
  }

  if (p.categories !== undefined && p.categories.trim()) {
    const categoryIds = resolveCategories(
      p.categories,
      ctx.categoryByName,
      p.sku,
      ctx.results.warnings,
    );
    await applyCategories(variant.productId, categoryIds);
  }

  ctx.results.updated++;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isFullAdmin(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const { action, products: rawProducts } = body;

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return NextResponse.json({ error: "No se recibieron productos." }, { status: 400 });
    }

    const products = normalizeBulkProductRows(rawProducts as Record<string, unknown>[]);
    const { supplierByName, categoryByName } = await loadLookupMaps();

    const results: BulkResults = {
      created: 0,
      updated: 0,
      errors: [],
      warnings: [],
    };

    const ctx = { supplierByName, categoryByName, results };

    if (action === "import") {
      for (const p of products) {
        try {
          await importProduct(p, ctx);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Error desconocido";
          results.errors.push(`Error en SKU ${p.sku || "?"}: ${message.slice(0, 120)}`);
        }
      }
    } else if (action === "update") {
      for (const p of products) {
        try {
          await updateProduct(p, ctx);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Error desconocido";
          results.errors.push(`Error en SKU ${p.sku || "?"}: ${message.slice(0, 120)}`);
        }
      }
    } else {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Bulk products error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
