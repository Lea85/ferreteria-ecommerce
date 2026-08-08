import { NextResponse } from "next/server";

/** Indica si OAuth (Google) está habilitado. No reemplazar /api/auth/providers de NextAuth. */
export async function GET() {
  return NextResponse.json({
    google: Boolean(
      process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
    ),
  });
}
