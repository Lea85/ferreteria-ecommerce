import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { CURRENCY, ORDER_PREFIX } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(amount: number): string {
  return arsFormatter.format(amount);
}

/**
 * Genera un número de pedido con formato legible (no garantiza unicidad).
 * Para números secuenciales persistidos usar `generateOrderNumber` en `order.service`.
 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `${ORDER_PREFIX}-${year}-${suffix}`;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
