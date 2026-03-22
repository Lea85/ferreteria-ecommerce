import Decimal from "decimal.js";

import type {
  CustomerType,
  DiscountType,
  PriceRuleType,
  PriceRuleScope,
} from "@/lib/constants";

export type PricingVariantInput = {
  id: string;
  productId: string;
  brandId: string | null;
  categoryIds: string[];
  /** Precio base de lista (variant.price) */
  basePrice: Decimal.Value;
};

export type PricingRuleInput = {
  id: string;
  name: string;
  type: PriceRuleType;
  scope: PriceRuleScope;
  customerType: CustomerType | null;
  minQuantity: number | null;
  discountType: DiscountType;
  discountValue: Decimal.Value;
  priority: number;
  isStackable: boolean;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  productIds: string[];
  categoryIds: string[];
  brandIds: string[];
};

export type AppliedPricingRule = {
  id: string;
  name: string;
  type: PriceRuleType;
  discountType: DiscountType;
  /** Descuento aplicado sobre el precio unitario en esta etapa (ARS) */
  discountAmount: string;
};

export type ItemPriceResult = {
  unitPrice: string;
  originalPrice: string;
  /** Descuento total por unidad respecto al precio original */
  discount: string;
  /** Descuento total de la línea (discount * quantity) */
  totalDiscount: string;
  appliedRules: AppliedPricingRule[];
};

export type CartLineInput = {
  variant: PricingVariantInput;
  quantity: number;
};

export type CartTotalCouponInput = {
  discountType: DiscountType;
  discountValue: Decimal.Value;
  minPurchase: Decimal.Value | null;
  /** null = todos los tipos de cliente */
  appliesToCustomerType: CustomerType | null;
};

export type CartTotalResult = {
  lines: Array<
    ItemPriceResult & {
      variantId: string;
      quantity: number;
      lineSubtotal: string;
    }
  >;
  subtotal: string;
  couponDiscount: string;
  totalAfterCoupon: string;
  couponApplied: boolean;
  couponMessage?: string;
};

const RULE_ORDER: PriceRuleType[] = ["ROLE", "VOLUME", "PROMO"];

function toDecimal(v: Decimal.Value): Decimal {
  return new Decimal(v);
}

function isRuleActive(rule: PricingRuleInput, now: Date): boolean {
  if (!rule.isActive) return false;
  if (rule.startsAt && now < rule.startsAt) return false;
  if (rule.endsAt && now > rule.endsAt) return false;
  return true;
}

function matchesScope(
  rule: PricingRuleInput,
  variant: PricingVariantInput,
): boolean {
  switch (rule.scope) {
    case "ALL_PRODUCTS":
      return true;
    case "SPECIFIC_PRODUCTS":
      return rule.productIds.includes(variant.productId);
    case "SPECIFIC_CATEGORIES":
      return variant.categoryIds.some((id) => rule.categoryIds.includes(id));
    case "SPECIFIC_BRANDS":
      return (
        variant.brandId !== null && rule.brandIds.includes(variant.brandId)
      );
    default:
      return false;
  }
}

function isApplicableForRole(
  rule: PricingRuleInput,
  customerType: CustomerType,
): boolean {
  if (rule.type !== "ROLE") return true;
  if (rule.customerType == null) return true;
  return rule.customerType === customerType;
}

function isApplicableForVolume(rule: PricingRuleInput, quantity: number): boolean {
  if (rule.type !== "VOLUME") return true;
  if (rule.minQuantity == null) return false;
  return quantity >= rule.minQuantity;
}

function collectApplicableRules(
  rules: PricingRuleInput[],
  variant: PricingVariantInput,
  quantity: number,
  customerType: CustomerType,
  now: Date,
): PricingRuleInput[] {
  return rules.filter(
    (r) =>
      isRuleActive(r, now) &&
      matchesScope(r, variant) &&
      isApplicableForRole(r, customerType) &&
      isApplicableForVolume(r, quantity),
  );
}

function unitDiscountForRule(
  currentUnit: Decimal,
  rule: PricingRuleInput,
): Decimal {
  const value = toDecimal(rule.discountValue);
  if (rule.discountType === "PERCENTAGE") {
    return currentUnit.mul(value).div(100);
  }
  return Decimal.min(value, currentUnit);
}

function applyRuleToUnit(
  currentUnit: Decimal,
  rule: PricingRuleInput,
): { next: Decimal; discount: Decimal } {
  const discount = unitDiscountForRule(currentUnit, rule);
  const next = Decimal.max(currentUnit.minus(discount), new Decimal(0));
  return { next, discount };
}

function processRuleGroup(
  type: PriceRuleType,
  rules: PricingRuleInput[],
  unitPrice: Decimal,
): { unit: Decimal; applied: AppliedPricingRule[] } {
  const group = rules.filter((r) => r.type === type);
  if (group.length === 0) {
    return { unit: unitPrice, applied: [] };
  }

  const stackable = group.filter((r) => r.isStackable);
  const nonStackable = group.filter((r) => !r.isStackable);

  let current = unitPrice;
  const applied: AppliedPricingRule[] = [];

  if (nonStackable.length > 0) {
    let bestUnit = current;
    let bestRules: AppliedPricingRule[] = [];

    for (const rule of nonStackable) {
      const { next, discount } = applyRuleToUnit(current, rule);
      if (next.lessThan(bestUnit)) {
        bestUnit = next;
        bestRules = [
          {
            id: rule.id,
            name: rule.name,
            type: rule.type,
            discountType: rule.discountType,
            discountAmount: discount.toFixed(2),
          },
        ];
      }
    }

    current = bestUnit;
    applied.push(...bestRules);
  }

  const sortedStack = [...stackable].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );

  for (const rule of sortedStack) {
    const before = current;
    const { next, discount } = applyRuleToUnit(current, rule);
    if (discount.greaterThan(0)) {
      applied.push({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        discountType: rule.discountType,
        discountAmount: discount.toFixed(2),
      });
    }
    current = next;
    if (before.equals(current)) break;
  }

  return { unit: current, applied };
}

/**
 * Motor de precios: base → ROLE → VOLUME → PROMO.
 * En cada etapa: reglas no acumulables = mejor descuento; acumulables = se aplican en serie.
 */
export function calculateItemPrice(
  variant: PricingVariantInput,
  quantity: number,
  customerType: CustomerType,
  rules: PricingRuleInput[],
  now: Date = new Date(),
): ItemPriceResult {
  const original = toDecimal(variant.basePrice);
  const applicable = collectApplicableRules(
    rules,
    variant,
    quantity,
    customerType,
    now,
  );

  let unit = original;
  const appliedRules: AppliedPricingRule[] = [];

  for (const type of RULE_ORDER) {
    const { unit: nextUnit, applied } = processRuleGroup(
      type,
      applicable,
      unit,
    );
    unit = nextUnit;
    appliedRules.push(...applied);
  }

  const discountPerUnit = original.minus(unit);

  return {
    unitPrice: unit.toFixed(2),
    originalPrice: original.toFixed(2),
    discount: discountPerUnit.toFixed(2),
    totalDiscount: discountPerUnit.mul(quantity).toFixed(2),
    appliedRules,
  };
}

export function calculateCartTotal(
  items: CartLineInput[],
  customerType: CustomerType,
  rules: PricingRuleInput[],
  coupon?: CartTotalCouponInput | null,
  now: Date = new Date(),
): CartTotalResult {
  const lines = items.map((item) => {
    const pricing = calculateItemPrice(
      item.variant,
      item.quantity,
      customerType,
      rules,
      now,
    );
    const lineSubtotal = toDecimal(pricing.unitPrice).mul(item.quantity);
    return {
      ...pricing,
      variantId: item.variant.id,
      quantity: item.quantity,
      lineSubtotal: lineSubtotal.toFixed(2),
    };
  });

  let subtotal = lines.reduce(
    (acc, l) => acc.plus(toDecimal(l.lineSubtotal)),
    new Decimal(0),
  );

  let couponDiscount = new Decimal(0);
  let couponApplied = false;
  let couponMessage: string | undefined;

  if (coupon) {
    const eligibleType =
      coupon.appliesToCustomerType == null ||
      coupon.appliesToCustomerType === customerType;

    if (!eligibleType) {
      couponMessage = "Este cupón no aplica a tu tipo de cuenta.";
    } else if (
      coupon.minPurchase != null &&
      subtotal.lessThan(toDecimal(coupon.minPurchase))
    ) {
      couponMessage = `Compra mínima no alcanzada para este cupón.`;
    } else {
      const val = toDecimal(coupon.discountValue);
      if (coupon.discountType === "PERCENTAGE") {
        couponDiscount = subtotal.mul(val).div(100);
      } else {
        couponDiscount = Decimal.min(val, subtotal);
      }
      couponApplied = true;
    }
  }

  const totalAfterCoupon = Decimal.max(
    subtotal.minus(couponDiscount),
    new Decimal(0),
  );

  return {
    lines,
    subtotal: subtotal.toFixed(2),
    couponDiscount: couponDiscount.toFixed(2),
    totalAfterCoupon: totalAfterCoupon.toFixed(2),
    couponApplied,
    couponMessage,
  };
}
