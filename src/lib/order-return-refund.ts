/** Factor de descuento a nivel pedido (mostrador, cupón, etc.) para prorratear reintegros. */
export function getOrderRefundFactor(orderSubtotal: number, orderTotal: number): number {
  if (orderSubtotal <= 0) return 1;
  return orderTotal / orderSubtotal;
}

export function computeLineRefundAmount(
  itemSubtotal: number,
  itemQuantity: number,
  returnQuantity: number,
  orderSubtotal: number,
  orderTotal: number,
): number {
  if (itemQuantity <= 0 || returnQuantity <= 0) return 0;
  const factor = getOrderRefundFactor(orderSubtotal, orderTotal);
  const unitBase = itemSubtotal / itemQuantity;
  return Math.round(unitBase * returnQuantity * factor * 100) / 100;
}

export function getReturnableQuantity(sold: number, alreadyReturned: number): number {
  return Math.max(0, sold - alreadyReturned);
}
