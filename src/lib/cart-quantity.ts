/** Limita cantidad al stock disponible (mínimo 1 si hay stock). */
export function clampToStock(quantity: number, stock: number): number {
  if (stock <= 0) return 1;
  return Math.min(Math.max(1, Math.floor(quantity)), stock);
}
