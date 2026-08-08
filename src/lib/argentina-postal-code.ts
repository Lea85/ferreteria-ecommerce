/** Primera letra del CPA según Correo Argentino / ISO provincias. */
export const CPA_PROVINCE_LETTERS: Record<string, string> = {
  A: "Salta",
  B: "Buenos Aires",
  C: "Ciudad Autónoma de Buenos Aires",
  D: "San Luis",
  E: "Entre Ríos",
  F: "La Rioja",
  G: "Santiago del Estero",
  H: "Chaco",
  J: "San Juan",
  K: "Catamarca",
  L: "La Pampa",
  M: "Mendoza",
  N: "Misiones",
  P: "Formosa",
  Q: "Neuquén",
  R: "Río Negro",
  S: "Santa Fe",
  T: "Tucumán",
  U: "Chubut",
  V: "Tierra del Fuego",
  W: "Corrientes",
  X: "Córdoba",
  Y: "Jujuy",
  Z: "Santa Cruz",
};

export type PostalCodeFormat = "legacy" | "cpa" | "invalid";

export function normalizePostalCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function detectPostalCodeFormat(code: string): PostalCodeFormat {
  const normalized = normalizePostalCodeInput(code);
  if (/^\d{4}$/.test(normalized)) return "legacy";
  if (/^[A-Z]\d{4}[A-Z]{3}$/.test(normalized)) return "cpa";
  return "invalid";
}

export function normalizeProvinceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function provinceMatchesCpaLetter(
  province: string,
  cpaLetter: string,
): boolean {
  const expected = CPA_PROVINCE_LETTERS[cpaLetter.toUpperCase()];
  if (!expected) return false;
  const a = normalizeProvinceName(province);
  const b = normalizeProvinceName(expected);
  return a.includes(b) || b.includes(a) || a === "caba" && b.includes("ciudad autonoma");
}
