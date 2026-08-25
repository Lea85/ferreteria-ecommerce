import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/db";
import { findProductIdsByTextSearch } from "@/lib/product-search";

export type AdminProductsFilterParams = {
  search?: string;
  /** @deprecated Prefer `categories`. Single category id or slug. */
  category?: string;
  categories?: string[];
  /** @deprecated Prefer `brands`. Single brand id for backward compatibility. */
  brand?: string;
  /** @deprecated Prefer `suppliers`. Single supplier id for backward compatibility. */
  supplier?: string;
  brands?: string[];
  suppliers?: string[];
  active?: string;
};

function normalizeIdList(
  plural?: string[],
  singular?: string,
): string[] {
  const fromPlural = (plural ?? [])
    .map((id) => id.trim())
    .filter(Boolean);
  if (fromPlural.length > 0) {
    return [...new Set(fromPlural)];
  }
  const one = singular?.trim();
  if (one && one !== "all") return [one];
  return [];
}

export function parseAdminProductsFilterParams(
  searchParams: URLSearchParams,
): AdminProductsFilterParams {
  const categoriesRaw = searchParams.get("categories");
  const brandsRaw = searchParams.get("brands");
  const suppliersRaw = searchParams.get("suppliers");

  return {
    search: searchParams.get("search")?.trim() || undefined,
    category: searchParams.get("category")?.trim() || undefined,
    categories: categoriesRaw
      ? [
          ...new Set(
            categoriesRaw.split(",").map((s) => s.trim()).filter(Boolean),
          ),
        ]
      : undefined,
    brand: searchParams.get("brand")?.trim() || undefined,
    supplier: searchParams.get("supplier")?.trim() || undefined,
    brands: brandsRaw
      ? [...new Set(brandsRaw.split(",").map((s) => s.trim()).filter(Boolean))]
      : undefined,
    suppliers: suppliersRaw
      ? [
          ...new Set(
            suppliersRaw.split(",").map((s) => s.trim()).filter(Boolean),
          ),
        ]
      : undefined,
    active: searchParams.get("active") ?? "all",
  };
}

export async function buildAdminProductsWhere(
  params: AdminProductsFilterParams,
): Promise<Prisma.ProductWhereInput | null> {
  const where: Prisma.ProductWhereInput = {};
  const search = params.search?.trim() || "";
  const active = params.active ?? "all";
  const categoryIds = normalizeIdList(params.categories, params.category);
  const brandIds = normalizeIdList(params.brands, params.brand);
  const supplierIds = normalizeIdList(params.suppliers, params.supplier);

  if (search) {
    const onlyActive = active === "true";
    const searchIds = await findProductIdsByTextSearch(search, {
      onlyActive: active === "all" ? false : onlyActive,
    });
    where.id = { in: searchIds.length > 0 ? searchIds : ["__no_match__"] };
  }

  if (active === "true") {
    where.isActive = true;
  } else if (active === "false") {
    where.isActive = false;
  }

  if (categoryIds.length > 0) {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { id: { in: categoryIds } },
          { slug: { in: categoryIds } },
        ],
      },
      select: { id: true },
    });
    if (categories.length === 0) return null;
    where.categories = {
      some: { categoryId: { in: categories.map((c) => c.id) } },
    };
  }

  if (brandIds.length > 0) {
    const brands = await prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true },
    });
    if (brands.length === 0) return null;
    where.brandId = { in: brands.map((b) => b.id) };
  }

  if (supplierIds.length > 0) {
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true },
    });
    if (suppliers.length === 0) return null;
    where.suppliers = {
      some: { supplierId: { in: suppliers.map((s) => s.id) } },
    };
  }

  return where;
}
