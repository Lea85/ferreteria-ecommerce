import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const locations = await prisma.warehouseLocation.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }, { row: "asc" }, { col: "asc" }],
    });

    return NextResponse.json({
      locations: locations.map((l) => ({
        id: l.id,
        code: l.code,
        label: l.label,
        display: l.name,
      })),
    });
  } catch (error) {
    console.error("Warehouse locations GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
