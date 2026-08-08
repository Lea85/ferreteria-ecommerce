const COUNTER_PAYMENT_METHODS = new Set([
  "COUNTER_CASH",
  "COUNTER_CREDIT_CARD",
  "COUNTER_CREDIT_ABSORBE_LOCAL",
  "COUNTER_CREDIT_ABSORBE_BANCO",
  "COUNTER_DEBIT_CARD",
  "COUNTER_TRANSFER",
  "COUNTER_MERCADOLIBRE",
]);

export type SalesChannel = "counter" | "web" | "mercadolibre";

export const MERCADOLIBRE_PAYMENT_METHOD = "COUNTER_MERCADOLIBRE";

export function isMercadoLibreCounterSale(paymentMethod: string): boolean {
  return paymentMethod === MERCADOLIBRE_PAYMENT_METHOD;
}

export function getOrderSalesChannel(order: {
  paymentMethod: string;
  notes?: string | null;
}): SalesChannel {
  if (isMercadoLibreCounterSale(order.paymentMethod)) return "mercadolibre";
  if (COUNTER_PAYMENT_METHODS.has(order.paymentMethod)) return "counter";
  if (order.notes?.includes("Compra mostrador")) return "counter";
  return "web";
}

export function isCounterPaymentMethod(paymentMethod: string): boolean {
  return COUNTER_PAYMENT_METHODS.has(paymentMethod);
}
