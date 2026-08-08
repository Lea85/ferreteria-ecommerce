import { Prisma } from "@/generated/prisma";
import { NextResponse } from "next/server";

import { auth, isFullAdmin } from "@/auth";
import {
  indexVariantsBySku,
  normalizeBulkProductRows,
  normalizeSkuFromCell,
  parseBulkNumericValue,
  parseCategoryNames,
  resolveVariantFromSkuIndex,
  type BulkVariantRef,
  type NormalizedBulkProductRow,
} from "@/lib/bulk-products-spreadsheet";
import { prisma } from "@/lib/db";
import { normalizeProductCode } from "@/lib/product-search";

export const maxDuration = 300;

type BulkResults = {
  created: number;
  updated: number;
  errors: string[];
  warnings: string[];
};

function toNumberOrUndefined(value: string | number | undefined): number | undefined {
  return parseBulkNumericValue(value);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function skuBaseFromName(name: string): string {
  const base = slugify(name).toUpperCase().replace(/-/g, "").slice(0, 24);
  return base || "PROD";
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = slugify(base) || "producto";
  let suffix = 2;
  while (await prisma.product.findUnique({ where: { slug: candidate } })) {
    candidate = `${slugify(base) || "producto"}-${suffix}`;
    suffix++;
  }
  return candidate;
}

async function generateUniqueSku(name: string): Promise<string> {
  const base = skuBaseFromName(name);
  let candidate = base;
  let suffix = 1;
  while (
    await prisma.productVariant.findFirst({
      where: {
        OR: [
          { sku: candidate },
          { sku: { equals: candidate, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    })
  ) {
    candidate = `${base.slice(0, 20)}-${suffix}`;
    suffix++;
  }
  return candidate;
}

function rowLabel(p: NormalizedBulkProductRow): string {
  if (p.sourceRow) return `Fila ${p.sourceRow}`;
  if (p.sku) return `SKU ${p.sku}`;
  if (p.name) return `"${p.name.slice(0, 40)}"`;
  return "Fila sin identificar";
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
  if (!p.name?.trim()) {
    ctx.results.errors.push(
      `${rowLabel(p)}: falta el nombre del producto.`,
    );
    return;
  }

  let sku = normalizeSkuFromCell(p.sku);
  if (!sku) {
    sku = await generateUniqueSku(p.name.trim());
    ctx.results.warnings.push(
      `${rowLabel(p)}: SKU generado automáticamente (${sku}).`,
    );
  }

  const existing = await prisma.productVariant.findFirst({
    where: {
      OR: [
        { sku },
        { sku: { equals: sku, mode: "insensitive" } },
      ],
    },
    select: { sku: true, product: { select: { name: true } } },
  });

  if (existing) {
    ctx.results.errors.push(
      `SKU ${sku} ya existe (${existing.product.name})`,
    );
    return;
  }

  const brandId = await upsertBrandId(p.brand);
  const supplierId = resolveSupplier(
    p.supplier,
    ctx.supplierByName,
    sku,
    ctx.results.warnings,
  );
  const categoryIds = resolveCategories(
    p.categories,
    ctx.categoryByName,
    sku,
    ctx.results.warnings,
  );

  const slug = await ensureUniqueSlug(p.name.trim());
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
            sku,
            ean: p.ean ? String(p.ean) : null,
            price: toNumberOrUndefined(p.price) ?? 0,
            costPrice: toNumberOrUndefined(p.costPrice) ?? null,
            comparePrice: toNumberOrUndefined(p.comparePrice) ?? null,
            stock: toNumberOrUndefined(p.stock) ?? 0,
            lowStockThreshold: toNumberOrUndefined(p.lowStockThreshold) ?? 5,
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

async function loadVariantsForBulkSkus(
  skus: string[],
): Promise<Map<string, BulkVariantRef>> {
  const lookupKeys = new Set<string>();
  for (const raw of skus) {
    const sku = normalizeSkuFromCell(raw);
    if (!sku) continue;
    lookupKeys.add(sku.trim().toLowerCase());
    const compact = normalizeProductCode(sku);
    if (compact) lookupKeys.add(compact);
  }

  if (lookupKeys.size === 0) {
    return new Map();
  }

  const keys = [...lookupKeys];
  const rows = await prisma.$queryRaw<BulkVariantRef[]>`
    SELECT id, "productId", sku
    FROM product_variants
    WHERE LOWER(TRIM(sku)) IN (${Prisma.join(keys)})
       OR REGEXP_REPLACE(LOWER(TRIM(sku)), '[\\s\\-_.]', '', 'g') IN (${Prisma.join(keys)})
  `;

  return indexVariantsBySku(rows);
}

async function updateProduct(
  p: NormalizedBulkProductRow,
  ctx: {
    supplierByName: Map<string, string>;
    categoryByName: Map<string, string>;
    variantIndex: Map<string, BulkVariantRef>;
    results: BulkResults;
  },
): Promise<void> {
  const sku = normalizeSkuFromCell(p.sku);
  if (!sku) {
    ctx.results.errors.push("Fila sin SKU, no se puede actualizar");
    return;
  }

  const variant = resolveVariantFromSkuIndex(sku, ctx.variantIndex);
  if (!variant) {
    ctx.results.errors.push(`SKU ${sku} no encontrado`);
    return;
  }

  let changed = false;

  const variantData: Record<string, unknown> = {};
  const price = toNumberOrUndefined(p.price);
  const costPrice = toNumberOrUndefined(p.costPrice);
  const comparePrice = toNumberOrUndefined(p.comparePrice);
  const stock = toNumberOrUndefined(p.stock);
  const lowStockThreshold = toNumberOrUndefined(p.lowStockThreshold);

  if (price !== undefined) variantData.price = price;
  if (costPrice !== undefined) variantData.costPrice = costPrice;
  if (comparePrice !== undefined) variantData.comparePrice = comparePrice;
  if (stock !== undefined) variantData.stock = stock;
  if (lowStockThreshold !== undefined) {
    variantData.lowStockThreshold = lowStockThreshold;
  }
  if (p.ean !== undefined && normalizeSkuFromCell(p.ean) !== "") {
    variantData.ean = normalizeSkuFromCell(p.ean);
  }

  if (Object.keys(variantData).length > 0) {
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: variantData,
    });
    changed = true;
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
    changed = true;
  }

  if (p.supplier !== undefined) {
    const supplierId = resolveSupplier(
      p.supplier,
      ctx.supplierByName,
      sku,
      ctx.results.warnings,
    );
    await applySupplier(variant.productId, supplierId, p.supplier);
    changed = true;
  }

  if (p.categories !== undefined && p.categories.trim()) {
    const categoryIds = resolveCategories(
      p.categories,
      ctx.categoryByName,
      sku,
      ctx.results.warnings,
    );
    if (categoryIds.length > 0) {
      await applyCategories(variant.productId, categoryIds);
      changed = true;
    }
  }

  if (changed) {
    ctx.results.updated++;
  } else {
    ctx.results.warnings.push(
      `SKU ${sku}: sin campos para actualizar (dejá vacías las columnas que no querés cambiar).`,
    );
  }
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
      return NextResponse.json(
        {
          error:
            "El archivo está vacío o no tiene filas de datos. Verificá que la primera hoja tenga productos debajo del encabezado.",
        },
        { status: 400 },
      );
    }

    const isImport = action === "import";
    const products = normalizeBulkProductRows(
      rawProducts as Record<string, unknown>[],
      { requireSku: !isImport },
    );

    if (products.length === 0) {
      const hint = isImport
        ? 'Completá al menos la columna "nombre". El SKU es opcional en altas nuevas (se genera automáticamente).'
        : 'La modificación masiva requiere la columna "sku" en cada fila a actualizar.';
      return NextResponse.json(
        {
          error: `No se pudo procesar ninguna fila (${rawProducts.length} leídas). ${hint}`,
          results: {
            created: 0,
            updated: 0,
            errors: [],
            warnings: [],
            skippedRows: rawProducts.length,
          },
        },
        { status: 400 },
      );
    }

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
      const variantIndex = await loadVariantsForBulkSkus(
        products.map((p) => p.sku),
      );
      const updateCtx = { ...ctx, variantIndex };

      for (const p of products) {
        try {
          await updateProduct(p, updateCtx);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Error desconocido";
          const sku = normalizeSkuFromCell(p.sku) || "?";
          if (message.includes("Unique constraint")) {
            results.errors.push(
              `Error en SKU ${sku}: valor duplicado (revisá EAN o SKU).`,
            );
          } else {
            results.errors.push(
              `Error en SKU ${sku}: ${message.slice(0, 120)}`,
            );
          }
        }
      }
    } else {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }

    return NextResponse.json({
      results: {
        ...results,
        processedRows: products.length,
        inputRows: rawProducts.length,
      },
    });
  } catch (error) {
    console.error("Bulk products error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
