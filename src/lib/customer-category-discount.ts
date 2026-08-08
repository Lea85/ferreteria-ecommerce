export type CategoryBenefit = {
  name: string;
  benefitType: string; // DISCOUNT_PERCENT | DISCOUNT_AMOUNT | VOLUME_DISCOUNT | FREE_SHIPPING
  benefitValue: number;
  minAmount: number | null;
  minQuantity: number | null;
};

export type AppliedDiscount = {
  categoryName: string;
  benefitType: string;
  /** Porcentaje aplicado, si el beneficio es porcentual. */
  percent: number | null;
  /** Monto del descuento en $ sobre el subtotal. */
  amount: number;
  /** Etiqueta lista para mostrar en el resumen. */
  label: string;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Ambas condiciones (monto mínimo y cantidad mínima) deben cumplirse.
 * Si alguna no está configurada (null o <= 0), se considera cumplida.
 */
export function benefitConditionsMet(
  benefit: CategoryBenefit,
  subtotal: number,
  totalQuantity: number,
): boolean {
  const amountOk =
    benefit.minAmount == null ||
    benefit.minAmount <= 0 ||
    subtotal >= benefit.minAmount;
  const quantityOk =
    benefit.minQuantity == null ||
    benefit.minQuantity <= 0 ||
    totalQuantity >= benefit.minQuantity;
  return amountOk && quantityOk;
}

export function computeBenefitDiscount(
  benefit: CategoryBenefit,
  subtotal: number,
  totalQuantity: number,
): AppliedDiscount | null {
  if (subtotal <= 0) return null;
  if (!benefitConditionsMet(benefit, subtotal, totalQuantity)) return null;

  const type = benefit.benefitType;

  if (type === "DISCOUNT_PERCENT" || type === "VOLUME_DISCOUNT") {
    const percent = Number(benefit.benefitValue) || 0;
    if (percent <= 0) return null;
    const amount = roundMoney(subtotal * (percent / 100));
    if (amount <= 0) return null;
    return {
      categoryName: benefit.name,
      benefitType: type,
      percent,
      amount,
      label: `Descuento ${benefit.name} (${percent}%)`,
    };
  }

  if (type === "DISCOUNT_AMOUNT") {
    const amount = roundMoney(Math.min(Number(benefit.benefitValue) || 0, subtotal));
    if (amount <= 0) return null;
    return {
      categoryName: benefit.name,
      benefitType: type,
      percent: null,
      amount,
      label: `Descuento ${benefit.name}`,
    };
  }

  // FREE_SHIPPING u otros: no afectan el precio de los productos.
  return null;
}

/**
 * Devuelve el descuento que más conviene al cliente entre todas sus
 * categorías activas (no se acumulan).
 */
export function computeBestCategoryDiscount(
  benefits: CategoryBenefit[],
  subtotal: number,
  totalQuantity: number,
): AppliedDiscount | null {
  let best: AppliedDiscount | null = null;
  for (const benefit of benefits) {
    const discount = computeBenefitDiscount(benefit, subtotal, totalQuantity);
    if (discount && (!best || discount.amount > best.amount)) {
      best = discount;
    }
  }
  return best;
}
