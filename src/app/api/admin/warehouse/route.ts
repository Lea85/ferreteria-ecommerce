import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

function locationCode(row: string, col: string) {
  return `${row.trim()}-${col.trim()}`;
}

function parseLocationBody(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const row = String(body.row ?? "").trim();
  const col = String(body.col ?? "").trim();
  const label =
    body.label === undefined ? undefined : String(body.label ?? "").trim();

  if (!name) {
    return { error: "El nombre es obligatorio." as const };
  }
  if (!row || !col) {
    return { error: "Fila y columna son obligatorias." as const };
  }

  return {
    name,
    row,
    col,
    code: locationCode(row, col),
    label,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const locations = await prisma.warehouseLocation.findMany({
      orderBy: [{ name: "asc" }, { row: "asc" }, { col: "asc" }],
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Warehouse GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = parseLocationBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const location = await prisma.warehouseLocation.create({
      data: {
        name: parsed.name,
        code: parsed.code,
        row: parsed.row,
        col: parsed.col,
        label: parsed.label || null,
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe esa ubicación con la misma fila y columna." },
        { status: 409 },
      );
    }
    console.error("Warehouse POST:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "Falta el id." }, { status: 400 });
    }

    const parsed = parseLocationBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const location = await prisma.warehouseLocation.update({
      where: { id },
      data: {
        name: parsed.name,
        code: parsed.code,
        row: parsed.row,
        col: parsed.col,
        label: parsed.label ? parsed.label : null,
      },
    });

    return NextResponse.json({ location });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe esa ubicación con la misma fila y columna." },
        { status: 409 },
      );
    }
    console.error("Warehouse PUT:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    }

    await prisma.product.updateMany({
      where: { warehouseLocationId: id },
      data: { warehouseLocationId: null },
    });
    await prisma.warehouseLocation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Warehouse DELETE:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
