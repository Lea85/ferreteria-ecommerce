import { NextResponse } from "next/server";

import { getMercadoPagoPublicConfig } from "@/lib/mercadopago-settings";

export async function GET() {
  try {
    const config = await getMercadoPagoPublicConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Mercado Pago config:", error);
    return NextResponse.json({ enabled: false, publicKey: null });
  }
}
