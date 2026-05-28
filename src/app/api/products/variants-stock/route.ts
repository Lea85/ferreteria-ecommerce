import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ stocks: {} });
    }

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, stock: true },
    });

    const stocks: Record<string, number> = {};
    for (const v of variants) {
      stocks[v.id] = v.stock;
    }

    return NextResponse.json({ stocks });
  } catch (error) {
    console.error("variants-stock error:", error);
    return NextResponse.json({ stocks: {} });
  }
}
