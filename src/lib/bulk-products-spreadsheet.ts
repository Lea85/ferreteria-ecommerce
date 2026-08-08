/** Encabezados en español para plantillas Excel (alta y modificación masiva). */
export const BULK_PRODUCT_TEMPLATE_COLUMNS = {
  sku: "sku",
  ean: "ean",
  nombre: "nombre",
  precio_compra: "precio_compra",
  precio_venta: "precio_venta",
  stock: "stock",
  stock_minimo: "stock_minimo",
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
  precio_de_compra: "costPrice",
  costprice: "costPrice",
  cost_price: "costPrice",
  precio_venta: "price",
  precio_de_venta: "price",
  precio_publicacion: "price",
  price: "price",
  compareprice: "comparePrice",
  compare_price: "comparePrice",
  precio_tachado: "comparePrice",
  stock: "stock",
  stock_minimo: "lowStockThreshold",
  stockminimo: "lowStockThreshold",
  lowstockthreshold: "lowStockThreshold",
  low_stock_threshold: "lowStockThreshold",
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
  lowStockThreshold?: string | number;
  description?: string;
  shortDesc?: string;
  brand?: string;
  supplier?: string;
  categories?: string;
  /** Fila del Excel (1-based, incluye encabezado). */
  sourceRow?: number;
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

/** Parsea montos/cantidades desde Excel (número nativo o texto con formato AR/US). */
export function parseBulkNumericValue(
  value: string | number | undefined | null,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  let s = String(value).trim();
  if (!s) return undefined;

  s = s.replace(/[$€£ARS\s]/gi, "");

  // Formato con símbolo de moneda y miles US: $4,400.00
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, "");
  } else if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d+$/.test(s)) {
    s = s.replace(",", ".");
  } else {
    // Formato US / miles con coma: 12,345.67
    s = s.replace(/,/g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function assignBulkNumericField(
  normalized: NormalizedBulkProductRow,
  field: "price" | "costPrice" | "comparePrice" | "stock" | "lowStockThreshold",
  rawValue: unknown,
) {
  if (rawValue === undefined || rawValue === null) return;

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    normalized[field] = rawValue;
    return;
  }

  const str = cellToString(rawValue);
  if (str === undefined) return;

  const parsed = parseBulkNumericValue(str);
  if (parsed !== undefined) {
    normalized[field] = parsed;
  }
}

/** Normaliza SKU/EAN leídos desde Excel (números, .0, espacios). */
export function normalizeSkuFromCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (Number.isInteger(value)) return String(value);
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 1e-6) return String(rounded);
    return String(value);
  }
  let s = String(value).trim();
  if (/^\d+\.0+$/.test(s)) {
    s = s.replace(/\.0+$/, "");
  }
  return s;
}

export function normalizeBulkProductRows(
  rows: Record<string, unknown>[],
  options?: { requireSku?: boolean },
): NormalizedBulkProductRow[] {
  const requireSku = options?.requireSku !== false;

  return rows
    .map((row, index) => {
    const normalized: NormalizedBulkProductRow = { sku: "" };
    normalized.sourceRow = index + 2;

    for (const [rawKey, rawValue] of Object.entries(row)) {
      const field = COLUMN_ALIASES[normalizeHeaderKey(rawKey)];
      if (!field) continue;

      if (field === "sku") {
        normalized.sku = normalizeSkuFromCell(rawValue);
        continue;
      }

      if (field === "ean") {
        const ean = normalizeSkuFromCell(rawValue);
        if (ean) normalized.ean = ean;
        continue;
      }

      if (
        field === "price" ||
        field === "costPrice" ||
        field === "comparePrice" ||
        field === "stock" ||
        field === "lowStockThreshold"
      ) {
        assignBulkNumericField(normalized, field, rawValue);
        continue;
      }

      const str = cellToString(rawValue);
      if (str === undefined) continue;
      if (
        field === "name" ||
        field === "description" ||
        field === "shortDesc" ||
        field === "brand" ||
        field === "supplier" ||
        field === "categories"
      ) {
        normalized[field] = str;
      }
    }

    return normalized;
  })
    .filter((row) => {
      if (requireSku) return row.sku.length > 0;
      return row.sku.length > 0 || Boolean(row.name?.trim());
    });
}

export type BulkParsePreview = {
  totalRows: number;
  withSku: number;
  withName: number;
  withEan: number;
  processableRows: number;
};

/** Vista previa del Excel antes de enviar al servidor. */
export function previewBulkSpreadsheetRows(
  rows: Record<string, unknown>[],
  mode: "import" | "update",
): BulkParsePreview {
  const normalized = normalizeBulkProductRows(rows, {
    requireSku: mode === "update",
  });
  let withSku = 0;
  let withName = 0;
  let withEan = 0;
  for (const row of rows) {
    const sku = normalizeSkuFromCell(row.sku);
    const name = cellToString(row.nombre) ?? cellToString(row.name);
    const ean = normalizeSkuFromCell(row.ean);
    if (sku) withSku++;
    if (name) withName++;
    if (ean) withEan++;
  }
  return {
    totalRows: rows.length,
    withSku,
    withName,
    withEan,
    processableRows: normalized.length,
  };
}

export type BulkVariantRef = {
  id: string;
  productId: string;
  sku: string;
};

/** Mapa SKU (exacto, minúsculas y sin separadores) → variante. */
export function indexVariantsBySku(
  variants: BulkVariantRef[],
): Map<string, BulkVariantRef> {
  const map = new Map<string, BulkVariantRef>();
  for (const variant of variants) {
    const trimmed = variant.sku.trim();
    const lower = trimmed.toLowerCase();
    const compact = lower.replace(/[\s\-_.]/g, "");
    map.set(trimmed, variant);
    map.set(lower, variant);
    if (compact) map.set(compact, variant);
  }
  return map;
}

export function resolveVariantFromSkuIndex(
  sku: string,
  index: Map<string, BulkVariantRef>,
): BulkVariantRef | null {
  const normalized = normalizeSkuFromCell(sku);
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  const compact = lower.replace(/[\s\-_.]/g, "");
  return (
    index.get(normalized) ??
    index.get(lower) ??
    (compact ? index.get(compact) : null) ??
    null
  );
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
  [BULK_PRODUCT_TEMPLATE_COLUMNS.stock_minimo]: 5,
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
  [BULK_PRODUCT_TEMPLATE_COLUMNS.stock_minimo]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.marca]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.proveedor]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.categorias]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion]: "",
  [BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion_corta]: "",
};

/** Orden de columnas para plantillas y exportación Excel. */
export const BULK_PRODUCT_COLUMN_ORDER = [
  BULK_PRODUCT_TEMPLATE_COLUMNS.sku,
  BULK_PRODUCT_TEMPLATE_COLUMNS.ean,
  BULK_PRODUCT_TEMPLATE_COLUMNS.nombre,
  BULK_PRODUCT_TEMPLATE_COLUMNS.precio_compra,
  BULK_PRODUCT_TEMPLATE_COLUMNS.precio_venta,
  BULK_PRODUCT_TEMPLATE_COLUMNS.stock,
  BULK_PRODUCT_TEMPLATE_COLUMNS.stock_minimo,
  BULK_PRODUCT_TEMPLATE_COLUMNS.marca,
  BULK_PRODUCT_TEMPLATE_COLUMNS.proveedor,
  BULK_PRODUCT_TEMPLATE_COLUMNS.categorias,
  BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion,
  BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion_corta,
] as const;

export type BulkProductExportRow = Record<
  (typeof BULK_PRODUCT_COLUMN_ORDER)[number],
  string | number
>;

export function buildBulkExportRow(input: {
  sku: string;
  ean?: string | null;
  name: string;
  costPrice?: number | null;
  price: number;
  stock: number;
  lowStockThreshold: number;
  brandName?: string | null;
  supplierNames: string[];
  categoryNames: string[];
  description?: string | null;
  shortDesc?: string | null;
}): BulkProductExportRow {
  return {
    [BULK_PRODUCT_TEMPLATE_COLUMNS.sku]: input.sku,
    [BULK_PRODUCT_TEMPLATE_COLUMNS.ean]: input.ean ?? "",
    [BULK_PRODUCT_TEMPLATE_COLUMNS.nombre]: input.name,
    [BULK_PRODUCT_TEMPLATE_COLUMNS.precio_compra]:
      input.costPrice != null ? Number(input.costPrice) : "",
    [BULK_PRODUCT_TEMPLATE_COLUMNS.precio_venta]: Number(input.price),
    [BULK_PRODUCT_TEMPLATE_COLUMNS.stock]: input.stock,
    [BULK_PRODUCT_TEMPLATE_COLUMNS.stock_minimo]: input.lowStockThreshold,
    [BULK_PRODUCT_TEMPLATE_COLUMNS.marca]: input.brandName ?? "",
    [BULK_PRODUCT_TEMPLATE_COLUMNS.proveedor]: input.supplierNames.join("; "),
    [BULK_PRODUCT_TEMPLATE_COLUMNS.categorias]: input.categoryNames.join("; "),
    [BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion]: input.description ?? "",
    [BULK_PRODUCT_TEMPLATE_COLUMNS.descripcion_corta]: input.shortDesc ?? "",
  };
}
