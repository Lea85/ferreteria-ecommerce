/** Normaliza un teléfono AR para wa.me (solo dígitos con código de país). */
export function toWhatsAppDigits(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("54")) return digits;
  // Celulares locales (ej. 11xxxxxxxx) → 549…
  if (digits.length === 10) return `549${digits}`;
  return `54${digits}`;
}

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  text: string,
): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function buildCustomerWhatsAppGreeting(name?: string | null): string {
  return name?.trim()
    ? `Hola ${name.trim()}, te escribo de la ferretería.`
    : "Hola, te escribo de la ferretería.";
}
