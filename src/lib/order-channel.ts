const COUNTER_PAYMENT_METHODS = new Set([
  "COUNTER_CASH",
  "COUNTER_CREDIT_CARD",
  "COUNTER_CREDIT_ABSORBE_LOCAL",
  "COUNTER_CREDIT_ABSORBE_BANCO",
  "COUNTER_DEBIT_CARD",
  "COUNTER_TRANSFER",
]);

export type SalesChannel = "counter" | "web";

export function getOrderSalesChannel(order: {
  paymentMethod: string;
  notes?: string | null;
}): SalesChannel {
  if (COUNTER_PAYMENT_METHODS.has(order.paymentMethod)) return "counter";
  if (order.notes?.includes("Compra mostrador")) return "counter";
  return "web";
}

export function isCounterPaymentMethod(paymentMethod: string): boolean {
  return COUNTER_PAYMENT_METHODS.has(paymentMethod);
}
