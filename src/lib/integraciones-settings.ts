import { prisma } from "@/lib/db";

/** Claves guardadas en Admin → Integraciones usadas en presupuestos. */
export const INTEGRACIONES_QUOTE_KEYS = [
  "store_name",
  "store_logo_url",
  "google_maps_address",
  "store_address",
  "whatsapp_number",
  "contact_email",
  "quote_validity_days",
] as const;

export async function getIntegracionesSettings(
  keys: readonly string[] = INTEGRACIONES_QUOTE_KEYS,
): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: [...keys] } },
  });

  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return map;
}
