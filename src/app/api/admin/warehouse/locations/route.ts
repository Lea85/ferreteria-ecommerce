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
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      locations: locations.map((location) => ({
        id: location.id,
        code: `${location.maxRows} × ${location.maxCols}`,
        label: location.label,
        display: location.name,
      })),
    });
  } catch (error) {
    console.error("Warehouse locations GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
