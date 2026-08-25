import type { ProductFormInitial } from "@/components/admin/ProductForm";

/** Datos del producto tal como los devuelve GET /api/admin/products/[id]. */
export type ProductApiCloneSource = {
  name: string;
  slug: string;
  description?: string | null;
  brandId?: string;
  warehouseLocationId?: string;
  categoryIds?: string[];
  supplierIds?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  metaTitle?: string | null;
  metaDesc?: string | null;
  variants?: Array<{
    id?: string;
    sku: string;
    ean?: string | null;
    price: number;
    costPrice?: number | null;
    comparePrice?: number | null;
    lowStockThreshold?: number;
    stock?: number;
    weight?: number | null;
    name?: string | null;
    attributeValueIds?: string[];
  }>;
  images?: Array<{ url: string; altText?: string | null }>;
};

/**
 * Prepara initialData para ProductForm al clonar: copia todos los campos
 * visibles pero sin ids de variantes (serán registros nuevos al guardar).
 */
export function prepareProductCloneInitialData(
  source: ProductApiCloneSource,
): ProductFormInitial {
  return {
    name: source.name,
    slug: source.slug,
    description: source.description ?? "",
    brandId: source.brandId ?? "",
    warehouseLocationId: source.warehouseLocationId ?? "",
    categoryIds: source.categoryIds ?? [],
    supplierIds: source.supplierIds ?? [],
    isActive: source.isActive ?? true,
    isFeatured: source.isFeatured ?? false,
    metaTitle: source.metaTitle ?? "",
    metaDesc: source.metaDesc ?? "",
    variants:
      source.variants?.map((v) => ({
        sku: v.sku,
        ean: v.ean ?? "",
        costPrice: v.costPrice ?? null,
        price: v.price,
        comparePrice: v.comparePrice ?? null,
        lowStockThreshold: v.lowStockThreshold ?? 5,
        stock: v.stock ?? 0,
        weight: v.weight ?? null,
        attributeValueIds: v.attributeValueIds ?? [],
      })) ?? [],
    images: source.images?.map((img) => ({
      url: img.url,
      altText: img.altText ?? "",
    })),
  };
}
