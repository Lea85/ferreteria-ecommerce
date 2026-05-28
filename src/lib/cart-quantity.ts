import { resolveCartQuantity } from "@/lib/cart-stock";

/** Limita cantidad al stock disponible (mínimo 1 si hay stock). */
export function clampToStock(quantity: number, stock: number): number {
  return resolveCartQuantity(quantity, stock, false);
}
