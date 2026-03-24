import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "rentals_enabled" } });
    if (setting?.value !== "true") {
      return NextResponse.json({ enabled: false, tools: [] });
    }

    const tools = await prisma.rentalTool.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { periods: { orderBy: { days: "asc" } } },
    });

    return NextResponse.json({
      enabled: true,
      tools: tools.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        imageUrl: t.imageUrl,
        deposit: t.deposit ? Number(t.deposit) : null,
        availableQty: t.availableQty,
        periods: t.periods.map((p) => ({
          id: p.id,
          label: p.label,
          days: p.days,
          price: Number(p.price),
        })),
      })),
    });
  } catch (error) {
    console.error("Rentals public GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
