import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const subscribers = await prisma.user.findMany({
      where: { newsletterOptIn: true },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        customerType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error("Admin newsletter error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
