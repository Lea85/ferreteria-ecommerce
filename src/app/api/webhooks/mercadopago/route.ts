import { NextResponse } from "next/server";

import { getMercadoPagoConfig } from "@/lib/mercadopago-settings";
import { syncOrderFromMercadoPagoPayment } from "@/lib/services/mercadopago.service";

export async function POST(request: Request) {
  try {
    const mpConfig = await getMercadoPagoConfig();
    if (!mpConfig) {
      return NextResponse.json({ received: true });
    }

    const url = new URL(request.url);
    let topic = url.searchParams.get("topic") || url.searchParams.get("type");
    let id = url.searchParams.get("id") || url.searchParams.get("data.id");

    if (!topic || !id) {
      try {
        const body = await request.json();
        topic = body?.type || body?.topic || topic;
        id = body?.data?.id || body?.id || id;
      } catch {
        // MP puede enviar body vacio en algunos casos
      }
    }

    if (topic === "payment" && id) {
      await syncOrderFromMercadoPagoPayment(id, mpConfig);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Mercado Pago webhook:", error);
    return NextResponse.json({ received: true });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
