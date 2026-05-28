/** Encabezados en español para plantillas Excel (alta y modificación masiva). */
export const BULK_PRODUCT_TEMPLATE_COLUMNS = {
  sku: "sku",
  ean: "ean",
  nombre: "nombre",
  precio_compra: "precio_compra",
  precio_venta: "precio_venta",
  stock: "stock",
  marca: "marca",
  proveedor: "proveedor",
  categorias: "categorias",
  descripcion: "descripcion",
  descripcion_corta: "descripcion_corta",
} as const;

const COLUMN_ALIASES: Record<string, keyof NormalizedBulkProductRow> = {
  sku: "sku",
  ean: "ean",
  nombre: "name",
  name: "name",
  precio_compra: "costPrice",
  costprice: "costPrice",
  cost_price: "costPrice",
  precio_venta: "price",
  precio_publicacion: "price",
  price: "price",
  compareprice: "comparePrice",
  compare_price: "comparePrice",
  precio_tachado: "comparePrice",
  stock: "stock",
  descripcion: "description",
  description: "description",
  descripcion_corta: "shortDesc",
  shortdesc: "shortDesc",
  short_desc: "shortDesc",
  marca: "brand",
  brand: "brand",
  proveedor: "supplier",
  supplier: "supplier",
  categorias: "categories",
  categories: "categories",
  categoria: "categories",
};

export type NormalizedBulkProductRow = {
  sku: string;
  ean?: string;
  name?: string;
  price?: string | number;
  costPrice?: string | number;
  comparePrice?: string | number;
  stock?: string | number;
  description?: string;
  shortDesc?: string;
  brand?: string;
  supplier?: string;
  categories?: string;
};

function normalizeHeaderKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
}

function cellToString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
}

export function normalizeBulkProductRows(
  rows: Record<string, unknown>[],
): NormalizedBulkProductRow[] {
  return rows.map((row) => {
    const normalized: NormalizedBulkProductRow = { sku: "" };

    for (const [rawKey, rawValue] of Object.entries(row)) {
      const field = COLUMN_ALIASES[normalizeHeaderKey(rawKey)];
      if (!field) continue;

      if (field === "sku") {
        normalized.sku = String(rawValue ?? "").trim();
        continue;
      }

      const str = cellToString(rawValue);
      if (str === undefined) continue;

      if (
        field === "price" ||
        field === "costPrice" ||
        field === "comparePrice" ||
        field === "stock"
      ) {
        normalized[field] = str;
      } else {
        normalized[field] = str;
      }
    }

    return normalized;
  });
}

export function parseCategoryNames(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(";").map((s) => s.trim()).filter(Boolean))];
}

export const BULK_IMPORT_TEMPLATE_ROW = {
  [BULK_PRODUCT_TEMPLATE_COLUMNS.sku]: "SKU-001",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.ean]: "7791234567890",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.nombre]: "Producto ejemplo",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.precio_compra]: 8000,
  [BULK_PRODUCT_TEMPLATE_COLUMNS.precio_venta]: 10000,
  [BULK_PRODUCT_TEMPLATE_COLUMNS.stock]: 50,
  [BULK_PRODUCT_TEMPLATE_COLUMNS.marca]: "FV",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.proveedor]: "Proveedor ejemplo",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.categorias]: "Plomeria; Herramientas",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion]: "Descripción completa del producto",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion_corta]: "Resumen corto",
};

export const BULK_UPDATE_TEMPLATE_ROW = {
  [BULK_PRODUCT_TEMPLATE_COLUMNS.sku]: "SKU-001",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.ean]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.nombre]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.precio_compra]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.precio_venta]: 12000,
  [BULK_PRODUCT_TEMPLATE_COLUMNS.stock]: 45,
  [BULK_PRODUCT_TEMPLATE_COLUMNS.marca]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.proveedor]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.categorias]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion_corta]: "",
};
