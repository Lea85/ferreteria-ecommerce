import { NextResponse } from "next/server";

import { validatePostalCode } from "@/lib/services/postal-code-validation.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") ?? "";
    const city = searchParams.get("city") ?? undefined;
    const state = searchParams.get("state") ?? undefined;

    if (!code.trim()) {
      return NextResponse.json({ error: "Código postal requerido." }, { status: 400 });
    }

    const result = await validatePostalCode({ code, city, state });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Postal code validate error:", error);
    return NextResponse.json(
      { error: "No se pudo validar el código postal." },
      { status: 500 },
    );
  }
}
