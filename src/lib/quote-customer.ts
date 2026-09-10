import type { CustomerType } from "@/generated/prisma";

export type QuoteContactSource = "operational" | "platform";

export type QuoteContact = {
  source: QuoteContactSource;
  id: string;
  name: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  customerType: CustomerType;
  taxIdType: string | null;
  taxId: string | null;
  companyName: string | null;
};

type ContactLike = {
  id: string;
  name: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  customerType: CustomerType;
  taxIdType?: string | null;
  taxId?: string | null;
  companyName?: string | null;
};

/**
 * Resuelve datos de contacto del presupuesto:
 * 1) Cliente operativo (si existe)
 * 2) Cliente de plataforma (User)
 */
export function resolveQuoteContact(quote: {
  operationalCustomer?: ContactLike | null;
  user?: ContactLike | null;
}): QuoteContact | null {
  if (quote.operationalCustomer) {
    const c = quote.operationalCustomer;
    return {
      source: "operational",
      id: c.id,
      name: c.name,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      customerType: c.customerType,
      taxIdType: c.taxIdType ?? null,
      taxId: c.taxId ?? null,
      companyName: c.companyName ?? null,
    };
  }
  if (quote.user) {
    const u = quote.user;
    return {
      source: "platform",
      id: u.id,
      name: u.name,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      customerType: u.customerType,
      taxIdType: u.taxIdType ?? null,
      taxId: u.taxId ?? null,
      companyName: u.companyName ?? null,
    };
  }
  return null;
}

export function quoteContactDisplayName(contact: QuoteContact | null): string {
  if (!contact) return "Sin cliente";
  return [contact.name, contact.lastName].filter(Boolean).join(" ").trim() ||
    contact.email ||
    contact.phone ||
    "Sin cliente";
}

/** Select Prisma reutilizable para joins de presupuesto */
export const quoteCustomerSelect = {
  id: true,
  name: true,
  lastName: true,
  email: true,
  phone: true,
  customerType: true,
  taxIdType: true,
  taxId: true,
  companyName: true,
} as const;
