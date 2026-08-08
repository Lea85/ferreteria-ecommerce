/**
 * Determina si una variante está en alerta de stock bajo.
 * Usa el stock mínimo (`lowStockThreshold`) configurado en la variante del producto.
 */
export function isLowStock(stock: number, lowStockThreshold: number): boolean {
  return stock <= lowStockThreshold;
}
