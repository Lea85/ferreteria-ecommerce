import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const PUBLIC_KEYS = [
  "store_name",
  "store_logo_url",
  "store_address",
  "store_phone",
  "google_maps_address",
  "whatsapp_number",
  "whatsapp_message",
  "whatsapp_floating",
  "instagram_profile",
  "mercadolibre_url",
  "bank_name",
  "bank_account_type",
  "bank_cbu",
  "bank_alias",
  "bank_holder",
  "bank_email",
  "contact_email",
  "quote_validity_days",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedKeys = searchParams.get("keys")?.split(",") ?? PUBLIC_KEYS;
    const allowedKeys = requestedKeys.filter((k) => PUBLIC_KEYS.includes(k));

    const settings = await prisma.setting.findMany({
      where: { key: { in: allowedKeys } },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return NextResponse.json({ settings: map });
  } catch (error) {
    console.error("Public settings error:", error);
    return NextResponse.json({ settings: {} });
  }
}
