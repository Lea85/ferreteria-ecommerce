/** Margen sobre costo: ((venta - compra) / compra) × 100 */
export function computeMarginPercent(
  costPrice: number,
  salePrice: number,
): number | null {
  if (!Number.isFinite(costPrice) || costPrice <= 0) return null;
  if (!Number.isFinite(salePrice)) return null;
  return Math.round(((salePrice - costPrice) / costPrice) * 10000) / 100;
}

export function parsePriceInput(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}
