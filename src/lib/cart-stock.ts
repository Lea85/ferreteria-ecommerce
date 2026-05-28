import { toast } from "sonner";

import type { CartItem } from "@/stores/cart.store";

/** Cantidad válida en carrito (con o sin tope por stock). */
export function resolveCartQuantity(
  quantity: number,
  stock: number,
  bypassStockLimit: boolean,
): number {
  const q = Math.max(1, Math.floor(quantity) || 1);
  if (bypassStockLimit) return q;
  if (stock <= 0) return 1;
  return Math.min(q, stock);
}

export function exceedsStock(quantity: number, stock: number): boolean {
  return quantity > stock;
}

export function cartHasOverStock(items: Pick<CartItem, "quantity" | "stock">[]): boolean {
  return items.some((i) => exceedsStock(i.quantity, i.stock));
}

export function toastOverStockWarning(productName: string, quantity: number, stock: number) {
  toast.warning(
    `"${productName}": ${quantity} u. en carrito, stock ${stock}. No podés finalizar la compra web; usá presupuesto o venta por mostrador.`,
    { duration: 7000 },
  );
}

export function toastCheckoutBlockedOverStock() {
  toast.error(
    "Hay productos sin stock suficiente para la compra web. Usá presupuesto o venta por mostrador.",
    { duration: 7000 },
  );
}
