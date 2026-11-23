import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

const MAX_GRID = 40;

function parseCount(value: unknown, label: string) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_GRID) {
    return {
      error: `${label} debe ser un número entero entre 1 y ${MAX_GRID}.` as const,
    };
  }
  return { value: n };
}

function parseLocationBody(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const rows = parseCount(body.maxRows ?? body.row, "La cantidad de filas");
  const cols = parseCount(body.maxCols ?? body.col, "La cantidad de columnas");
  const label =
    body.label === undefined ? undefined : String(body.label ?? "").trim();

  if (!name) {
    return { error: "El nombre es obligatorio." as const };
  }
  if ("error" in rows) return rows;
  if ("error" in cols) return cols;

  return {
    name,
    maxRows: rows.value,
    maxCols: cols.value,
    code: `${rows.value}x${cols.value}`,
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
      orderBy: { name: "asc" },
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
        maxRows: parsed.maxRows,
        maxCols: parsed.maxCols,
        label: parsed.label || null,
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una ubicación con ese nombre." },
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

    const outside = await prisma.product.count({
      where: {
        warehouseLocationId: id,
        OR: [
          { warehouseRow: { gt: parsed.maxRows } },
          { warehouseCol: { gt: parsed.maxCols } },
        ],
      },
    });
    if (outside > 0) {
      return NextResponse.json(
        {
          error:
            "Hay productos en filas o columnas que quedarían fuera de la grilla.",
        },
        { status: 400 },
      );
    }

    const location = await prisma.warehouseLocation.update({
      where: { id },
      data: {
        name: parsed.name,
        code: parsed.code,
        maxRows: parsed.maxRows,
        maxCols: parsed.maxCols,
        label: parsed.label ? parsed.label : null,
      },
    });

    return NextResponse.json({ location });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una ubicación con ese nombre." },
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
      data: {
        warehouseLocationId: null,
        warehouseRow: null,
        warehouseCol: null,
      },
    });
    await prisma.warehouseLocation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Warehouse DELETE:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
