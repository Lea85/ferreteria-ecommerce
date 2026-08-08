export const IVA_RATE = 0.21;

export const CURRENCY = "ARS";

export const ORDER_PREFIX = "FER";
export const RETURN_PREFIX = "DEV";

export type CustomerType = "CONSUMER" | "TRADE" | "WHOLESALE";
export type OrderStatus = "PENDING" | "PAYMENT_PENDING" | "PAYMENT_APPROVED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "PARTIALLY_REFUNDED" | "REFUNDED";
export type PaymentMethod =
  | "MERCADO_PAGO"
  | "BANK_TRANSFER"
  | "CASH_ON_PICKUP"
  | "COUNTER_CASH"
  | "COUNTER_CREDIT_CARD"
  | "COUNTER_CREDIT_ABSORBE_LOCAL"
  | "COUNTER_CREDIT_ABSORBE_BANCO"
  | "COUNTER_DEBIT_CARD"
  | "COUNTER_TRANSFER"
  | "COUNTER_MERCADOLIBRE";
export type PriceRuleType = "ROLE" | "VOLUME" | "PROMO";
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
export type PriceRuleScope = "ALL_PRODUCTS" | "SPECIFIC_PRODUCTS" | "SPECIFIC_CATEGORIES" | "SPECIFIC_BRANDS";
export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN" | "MOSTRADOR";
export type ShippingMethod = "STORE_PICKUP" | "OWN_DELIVERY" | "CARRIER";

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  CONSUMER: "Consumidor final",
  TRADE: "Gremio / Instalador",
  WHOLESALE: "Mayorista / Empresa",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PAYMENT_PENDING: "Pago pendiente de validación",
  PAYMENT_APPROVED: "Pago confirmado",
  PREPARING: "En preparación",
  SHIPPED: "Despachado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  PARTIALLY_REFUNDED: "Devolución parcial",
  REFUNDED: "Reembolsado",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MERCADO_PAGO: "Mercado Pago",
  BANK_TRANSFER: "Transferencia bancaria",
  CASH_ON_PICKUP: "Efectivo al retiro en sucursal",
  COUNTER_CASH: "Efectivo",
  COUNTER_CREDIT_CARD: "Tarjeta de crédito",
  COUNTER_CREDIT_ABSORBE_LOCAL: "Tarjeta de crédito absorbe local",
  COUNTER_CREDIT_ABSORBE_BANCO: "Tarjeta de crédito absorbe banco",
  COUNTER_DEBIT_CARD: "Tarjeta de débito",
  COUNTER_TRANSFER: "Transferencia",
  COUNTER_MERCADOLIBRE: "Compra MercadoLibre",
};

const COUNTER_CREDIT_PRINT_LABEL_METHODS = new Set<PaymentMethod>([
  "COUNTER_CREDIT_ABSORBE_LOCAL",
  "COUNTER_CREDIT_ABSORBE_BANCO",
]);

/** Etiqueta de pago solo para impresión de venta mostrador (no altera pantalla ni admin). */
export function getCounterSalePrintPaymentLabel(paymentMethod: string): string {
  if (COUNTER_CREDIT_PRINT_LABEL_METHODS.has(paymentMethod as PaymentMethod)) {
    return "Tarjeta de crédito";
  }
  return (
    PAYMENT_METHOD_LABELS[paymentMethod as PaymentMethod] || paymentMethod
  );
}

export const COUNTER_PAYMENT_OPTIONS = [
  { value: "COUNTER_CASH", label: "Efectivo" },
  { value: "COUNTER_CREDIT_ABSORBE_LOCAL", label: "Tarjeta de crédito absorbe local" },
  { value: "COUNTER_CREDIT_ABSORBE_BANCO", label: "Tarjeta de crédito absorbe banco" },
  { value: "COUNTER_DEBIT_CARD", label: "Tarjeta de débito" },
  { value: "COUNTER_TRANSFER", label: "Transferencia" },
  { value: "COUNTER_MERCADOLIBRE", label: "Compra MercadoLibre" },
] as const;

export type CounterPaymentMethod = (typeof COUNTER_PAYMENT_OPTIONS)[number]["value"];

/** Medios de pago mostrador que permiten editar el total a cobrar. */
export function counterPaymentAllowsCustomTotal(
  method: string,
): method is "COUNTER_MERCADOLIBRE" {
  return method === "COUNTER_MERCADOLIBRE";
}

export const PRICE_RULE_TYPE_LABELS: Record<PriceRuleType, string> = {
  ROLE: "Por tipo de cliente",
  VOLUME: "Por volumen",
  PROMO: "Promoción",
};

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: "Porcentaje",
  FIXED_AMOUNT: "Monto fijo",
};

export const PRICE_RULE_SCOPE_LABELS: Record<PriceRuleScope, string> = {
  ALL_PRODUCTS: "Todo el catálogo",
  SPECIFIC_PRODUCTS: "Productos seleccionados",
  SPECIFIC_CATEGORIES: "Categorías seleccionadas",
  SPECIFIC_BRANDS: "Marcas seleccionadas",
};

export const DEFAULT_PAGE = 1;

export const DEFAULT_PAGE_SIZE = 24;

export const MAX_PAGE_SIZE = 100;

export const SITE_NAME = "FerroSan";
export const SITE_TAGLINE = "Ferretería y Casa de Sanitarios";
export const FREE_SHIPPING_THRESHOLD = 100_000;

export const NAV_CATEGORIES = [
  { name: "Sanitarios y baño", slug: "sanitarios" },
  { name: "Griferías", slug: "griferias" },
  { name: "Herramientas", slug: "herramientas" },
  { name: "Plomería", slug: "plomeria" },
  { name: "Electricidad", slug: "electricidad" },
  { name: "Pinturería", slug: "pintureria" },
] as const;

export const RECENT_SEARCHES_KEY = "ferrosan-recent-searches";
export const MAX_RECENT_SEARCHES = 8;
