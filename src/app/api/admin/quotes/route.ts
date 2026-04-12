import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const where: any = {};

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const [total, quotes] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, lastName: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    const mapped = quotes.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      customerName: [q.user.name, q.user.lastName].filter(Boolean).join(" "),
      customerEmail: q.user.email,
      status: q.status,
      total: Number(q.total),
      itemCount: q._count.items,
      validUntil: q.validUntil,
      createdAt: q.createdAt,
    }));

    return NextResponse.json({
      quotes: mapped,
      total,
      page,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin quotes GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
