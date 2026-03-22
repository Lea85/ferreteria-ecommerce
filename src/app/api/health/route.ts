import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  checks.env_DATABASE_URL = process.env.DATABASE_URL ? "SET" : "MISSING";
  checks.env_AUTH_SECRET = process.env.AUTH_SECRET ? "SET" : "MISSING";
  checks.env_AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST ?? "NOT SET";

  try {
    const count = await prisma.user.count();
    checks.db_connection = "OK";
    checks.db_user_count = String(count);
  } catch (err: any) {
    checks.db_connection = "FAIL";
    checks.db_error = err?.message?.substring(0, 200) ?? "unknown";
  }

  return NextResponse.json(checks);
}
