/** Margen sobre costo: (venta - costo) / costo × 100 */
export function profitMarginPercent(
  salePrice: number,
  costPrice: number | null | undefined,
): number | null {
  const cost = Number(costPrice);
  const sale = Number(salePrice);
  if (!Number.isFinite(cost) || !Number.isFinite(sale) || cost <= 0) return null;
  return ((sale - cost) / cost) * 100;
}

export function formatProfitMarginPercent(
  salePrice: number,
  costPrice: number | null | undefined,
): string {
  const pct = profitMarginPercent(salePrice, costPrice);
  if (pct === null) return "—";
  const sign = pct >= 0 ? "" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
