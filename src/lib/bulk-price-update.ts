export function roundPrice(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Aplica un ajuste porcentual (puede ser negativo) sobre un precio existente. */
export function applyPricePercentChange(
  current: number | null | undefined,
  percent: number,
): number | null {
  if (percent === 0 || current == null || !Number.isFinite(current)) {
    return current ?? null;
  }
  return roundPrice(current * (1 + percent / 100));
}

export type PriceUpdateCatalogRow = {
  id: string;
  variantId: string;
  productId: string;
  sku: string;
  ean: string | null;
  description: string;
  costPrice: number | null;
  price: number;
};

export type PriceUpdatePreviewRow = {
  variantId: string;
  sku: string;
  description: string;
  currentCostPrice: number | null;
  newCostPrice: number | null;
  currentSalePrice: number;
  newSalePrice: number;
  costUpdateSkipped: boolean;
};

export function buildPriceUpdatePreview(
  selected: PriceUpdateCatalogRow[],
  costPercent: number,
  salePercent: number,
): PriceUpdatePreviewRow[] {
  return selected.map((row) => {
    const costUpdateSkipped =
      costPercent !== 0 && (row.costPrice == null || !Number.isFinite(row.costPrice));
    return {
      variantId: row.variantId,
      sku: row.sku,
      description: row.description,
      currentCostPrice: row.costPrice,
      newCostPrice: applyPricePercentChange(row.costPrice, costPercent),
      currentSalePrice: row.price,
      newSalePrice:
        salePercent !== 0
          ? applyPricePercentChange(row.price, salePercent) ?? row.price
          : row.price,
      costUpdateSkipped,
    };
  });
}
