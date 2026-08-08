import { prisma } from "@/lib/db";

export const MERCADOPAGO_SETTING_KEYS = [
  "mercadopago_enabled",
  "mercadopago_public_key",
  "mercadopago_access_token",
  "mercadopago_sandbox",
] as const;

export type MercadoPagoSettingKey = (typeof MERCADOPAGO_SETTING_KEYS)[number];

export type MercadoPagoConfig = {
  enabled: boolean;
  publicKey: string;
  accessToken: string;
  sandbox: boolean;
};

export async function getMercadoPagoSettingsRaw(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: [...MERCADOPAGO_SETTING_KEYS] } },
  });

  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return map;
}

export async function getMercadoPagoConfig(): Promise<MercadoPagoConfig | null> {
  const raw = await getMercadoPagoSettingsRaw();
  const accessToken = raw.mercadopago_access_token?.trim() ?? "";
  const publicKey = raw.mercadopago_public_key?.trim() ?? "";

  if (raw.mercadopago_enabled !== "true" || !accessToken || !publicKey) {
    return null;
  }

  return {
    enabled: true,
    publicKey,
    accessToken,
    sandbox: raw.mercadopago_sandbox === "true",
  };
}

export async function getMercadoPagoPublicConfig(): Promise<{
  enabled: boolean;
  publicKey: string | null;
}> {
  const raw = await getMercadoPagoSettingsRaw();
  const enabled = raw.mercadopago_enabled === "true";
  const publicKey = raw.mercadopago_public_key?.trim() || null;

  return {
    enabled: enabled && Boolean(publicKey),
    publicKey: enabled ? publicKey : null,
  };
}
