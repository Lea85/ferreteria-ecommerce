import { NextResponse } from "next/server";

import { auth, isFullAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { MERCADOPAGO_SETTING_KEYS } from "@/lib/mercadopago-settings";
import { getAppBaseUrl } from "@/lib/app-url";

function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "********";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isFullAdmin(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const settings = await prisma.setting.findMany({
      where: { key: { in: [...MERCADOPAGO_SETTING_KEYS] } },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const accessToken = map.mercadopago_access_token ?? "";

    return NextResponse.json({
      enabled: map.mercadopago_enabled === "true",
      publicKey: map.mercadopago_public_key ?? "",
      sandbox: map.mercadopago_sandbox === "true",
      hasAccessToken: Boolean(accessToken),
      accessTokenMasked: maskToken(accessToken),
      webhookUrl: `${getAppBaseUrl()}/api/webhooks/mercadopago`,
    });
  } catch (error) {
    console.error("Admin Mercado Pago GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isFullAdmin(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const {
      enabled,
      publicKey,
      accessToken,
      sandbox,
    } = body as {
      enabled?: boolean;
      publicKey?: string;
      accessToken?: string;
      sandbox?: boolean;
    };

    const entries: Record<string, string> = {
      mercadopago_enabled: enabled ? "true" : "false",
      mercadopago_public_key: (publicKey ?? "").trim(),
      mercadopago_sandbox: sandbox ? "true" : "false",
    };

    if (accessToken !== undefined && accessToken.trim() !== "") {
      entries.mercadopago_access_token = accessToken.trim();
    }

    for (const [key, value] of Object.entries(entries)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin Mercado Pago PUT:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
