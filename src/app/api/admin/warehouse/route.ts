import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

// GET: listar sectores con sus ubicaciones
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const sectors = await prisma.warehouseSector.findMany({
      orderBy: { name: "asc" },
      include: {
        locations: {
          orderBy: [{ shelf: "asc" }, { row: "asc" }, { col: "asc" }],
          include: { _count: { select: { products: true } } },
        },
      },
    });

    return NextResponse.json({ sectors });
  } catch (error) {
    console.error("Warehouse GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// POST: crear sector o ubicacion
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();

    if (body.type === "sector") {
      const sector = await prisma.warehouseSector.create({
        data: { name: body.name, description: body.description || null },
      });
      return NextResponse.json({ sector }, { status: 201 });
    }

    if (body.type === "location") {
      const code = `${body.shelf}-${body.row}-${body.col}`.toUpperCase();
      const location = await prisma.warehouseLocation.create({
        data: {
          sectorId: body.sectorId,
          code,
          shelf: body.shelf.toUpperCase(),
          row: body.row,
          col: body.col,
          label: body.label || null,
        },
      });
      return NextResponse.json({ location }, { status: 201 });
    }

    return NextResponse.json({ error: "Tipo invalido." }, { status: 400 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un registro con ese nombre/codigo." }, { status: 409 });
    }
    console.error("Warehouse POST:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// PUT: editar sector o ubicacion
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();

    if (body.type === "sector") {
      const sector = await prisma.warehouseSector.update({
        where: { id: body.id },
        data: {
          name: body.name ?? undefined,
          description: body.description ?? undefined,
          isActive: body.isActive ?? undefined,
        },
      });
      return NextResponse.json({ sector });
    }

    if (body.type === "location") {
      const data: any = {};
      if (body.shelf) data.shelf = body.shelf.toUpperCase();
      if (body.row) data.row = body.row;
      if (body.col) data.col = body.col;
      if (body.shelf || body.row || body.col) {
        data.code = `${body.shelf || ""}-${body.row || ""}-${body.col || ""}`.toUpperCase();
      }
      if (body.label !== undefined) data.label = body.label || null;
      if (body.sectorId) data.sectorId = body.sectorId;
      if (body.isActive !== undefined) data.isActive = body.isActive;

      const location = await prisma.warehouseLocation.update({
        where: { id: body.id },
        data,
      });
      return NextResponse.json({ location });
    }

    return NextResponse.json({ error: "Tipo invalido." }, { status: 400 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un registro con ese codigo." }, { status: 409 });
    }
    console.error("Warehouse PUT:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// DELETE: eliminar sector o ubicacion
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "Tipo e ID requeridos." }, { status: 400 });
    }

    if (type === "sector") {
      await prisma.warehouseSector.delete({ where: { id } });
    } else if (type === "location") {
      // Desasociar productos primero
      await prisma.product.updateMany({
        where: { warehouseLocationId: id },
        data: { warehouseLocationId: null },
      });
      await prisma.warehouseLocation.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Warehouse DELETE:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
