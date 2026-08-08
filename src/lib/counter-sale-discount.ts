export const COUNTER_DISCOUNT_PERCENTS = [0, 5, 10, 15, 20, 25, 30] as const;

export type CounterDiscountPercent =
  (typeof COUNTER_DISCOUNT_PERCENTS)[number];

export type CounterRoundingMode = "none" | "multiple" | "manual";

export const DEFAULT_ROUNDING_MULTIPLE = 50;

export const COUNTER_ROUNDING_OPTIONS: {
  value: CounterRoundingMode;
  label: string;
}[] = [
  { value: "none", label: "Sin redondeo" },
  { value: "multiple", label: "Redondeo" },
  { value: "manual", label: "Redondeo manual" },
];

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isCounterDiscountPercent(
  value: number,
): value is CounterDiscountPercent {
  return (COUNTER_DISCOUNT_PERCENTS as readonly number[]).includes(value);
}

export function parseCounterDiscountPercent(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !isCounterDiscountPercent(n)) {
    throw new Error("Porcentaje de descuento inválido.");
  }
  return n;
}

export function computeCounterDiscountAmount(
  subtotal: number,
  percent: number,
): { discountAmount: number; totalToCharge: number } {
  const discountAmount = roundMoney((subtotal * percent) / 100);
  const totalToCharge = roundMoney(subtotal - discountAmount);
  return { discountAmount, totalToCharge };
}

/** Baja el importe al múltiplo inferior (ej. 321,13 con 50 → 300). */
export function floorToMultiple(amount: number, multiple: number): number {
  if (!Number.isFinite(multiple) || multiple <= 0) {
    throw new Error("El múltiplo de redondeo debe ser mayor a cero.");
  }
  return roundMoney(Math.floor(amount / multiple) * multiple);
}

export function parseCounterRoundingMode(value: unknown): CounterRoundingMode {
  const mode = String(value ?? "none");
  if (mode === "multiple" || mode === "manual" || mode === "none") {
    return mode;
  }
  throw new Error("Modo de redondeo inválido.");
}

export function computeCounterSaleTotals(
  subtotal: number,
  discountPercent: number,
  rounding: {
    mode: CounterRoundingMode;
    multiple?: number;
    manualTotal?: number;
  } = { mode: "none" },
) {
  const { discountAmount, totalToCharge: totalAfterDiscount } =
    computeCounterDiscountAmount(subtotal, discountPercent);

  let finalTotal = totalAfterDiscount;
  let roundingDiscount = 0;

  if (rounding.mode === "multiple") {
    const multiple = rounding.multiple ?? DEFAULT_ROUNDING_MULTIPLE;
    finalTotal = floorToMultiple(totalAfterDiscount, multiple);
    roundingDiscount = roundMoney(totalAfterDiscount - finalTotal);
  } else if (rounding.mode === "manual") {
    const manual = Number(rounding.manualTotal);
    if (!Number.isFinite(manual) || manual <= 0) {
      throw new Error("Indicá un total manual válido.");
    }
    if (manual >= totalAfterDiscount) {
      throw new Error(
        "El total manual debe ser menor al importe con el descuento aplicado.",
      );
    }
    finalTotal = roundMoney(manual);
    roundingDiscount = roundMoney(totalAfterDiscount - finalTotal);
  }

  return {
    discountAmount,
    totalAfterDiscount,
    roundingDiscount,
    finalTotal,
    totalDiscount: roundMoney(discountAmount + roundingDiscount),
  };
}

const ROUNDING_NOTE_REGEX = /descuento redondeo \(-([0-9]+(?:\.[0-9]{1,2})?)\)/i;

export function parseRoundingDiscountFromNotes(
  notes: string | null | undefined,
): number {
  if (!notes) return 0;
  const match = notes.match(ROUNDING_NOTE_REGEX);
  return match ? Number(match[1]) : 0;
}

export function splitCounterSaleDiscounts(
  subtotal: number,
  discountTotal: number,
  notes?: string | null,
) {
  const roundingDiscount = parseRoundingDiscountFromNotes(notes ?? null);
  const percentDiscountAmount = roundMoney(
    Math.max(0, discountTotal - roundingDiscount),
  );
  const discountPercent = inferCounterDiscountPercent(
    subtotal,
    percentDiscountAmount,
  );
  return {
    percentDiscountAmount,
    roundingDiscount,
    discountPercent,
  };
}

/** Recupera el % aplicado comparando subtotal y descuento guardados en el pedido. */
export function inferCounterDiscountPercent(
  subtotal: number,
  discountTotal: number,
): CounterDiscountPercent {
  if (discountTotal <= 0 || subtotal <= 0) return 0;
  for (const p of COUNTER_DISCOUNT_PERCENTS) {
    if (p === 0) continue;
    const { discountAmount } = computeCounterDiscountAmount(subtotal, p);
    if (Math.abs(discountAmount - discountTotal) < 0.02) return p;
  }
  return 0;
}