export const IVA_RATE = 0.21;

export const CURRENCY = "ARS";

export const ORDER_PREFIX = "FER";

export type CustomerType = "CONSUMER" | "TRADE" | "WHOLESALE";
export type OrderStatus = "PENDING" | "PAYMENT_PENDING" | "PAYMENT_APPROVED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
export type PaymentMethod = "MERCADO_PAGO" | "BANK_TRANSFER" | "CASH_ON_PICKUP";
export type PriceRuleType = "ROLE" | "VOLUME" | "PROMO";
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
export type PriceRuleScope = "ALL_PRODUCTS" | "SPECIFIC_PRODUCTS" | "SPECIFIC_CATEGORIES" | "SPECIFIC_BRANDS";
export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
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
  REFUNDED: "Reembolsado",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MERCADO_PAGO: "Mercado Pago",
  BANK_TRANSFER: "Transferencia bancaria",
  CASH_ON_PICKUP: "Efectivo al retiro en sucursal",
};

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
