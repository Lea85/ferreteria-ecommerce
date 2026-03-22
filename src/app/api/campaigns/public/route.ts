import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const campaigns = await prisma.banner.findMany({
      where: {
        position: "HOME_HERO",
        isActive: true,
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: { gte: now } },
        ],
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        linkUrl: true,
        ctaText: true,
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Public campaigns error:", error);
    return NextResponse.json({ campaigns: [] });
  }
}
