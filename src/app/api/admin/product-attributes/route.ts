import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (
    !session?.user ||
    !["ADMIN", "SUPER_ADMIN"].includes(
      String((session.user as { role?: string }).role ?? ""),
    )
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const attributes = await prisma.attribute.findMany({
      orderBy: { position: "asc" },
      include: {
        values: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ attributes });
  } catch (error) {
    console.error("Product attributes GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "createAttribute") {
      const name = (body.name || "").trim();
      if (!name) {
        return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
      }
      const maxPos = await prisma.attribute.aggregate({ _max: { position: true } });
      const attribute = await prisma.attribute.create({
        data: { name, position: (maxPos._max.position ?? -1) + 1 },
        include: { values: true },
      });
      return NextResponse.json({ attribute });
    }

    if (action === "updateAttribute") {
      const { id, name } = body;
      if (!id || !name?.trim()) {
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
      }
      const attribute = await prisma.attribute.update({
        where: { id },
        data: { name: name.trim() },
        include: { values: true },
      });
      return NextResponse.json({ attribute });
    }

    if (action === "deleteAttribute") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

      const usedCount = await prisma.variantAttributeValue.count({
        where: { attributeValue: { attributeId: id } },
      });
      if (usedCount > 0) {
        return NextResponse.json(
          { error: `Este atributo esta en uso por ${usedCount} variante(s). Elimine las asignaciones primero.` },
          { status: 400 },
        );
      }

      await prisma.attribute.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    if (action === "addValue") {
      const { attributeId, value } = body;
      if (!attributeId || !value?.trim()) {
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
      }
      const maxPos = await prisma.attributeValue.aggregate({
        where: { attributeId },
        _max: { position: true },
      });
      const attrValue = await prisma.attributeValue.create({
        data: {
          attributeId,
          value: value.trim(),
          position: (maxPos._max.position ?? -1) + 1,
        },
      });
      return NextResponse.json({ value: attrValue });
    }

    if (action === "updateValue") {
      const { id, value } = body;
      if (!id || !value?.trim()) {
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
      }
      const attrValue = await prisma.attributeValue.update({
        where: { id },
        data: { value: value.trim() },
      });
      return NextResponse.json({ value: attrValue });
    }

    if (action === "deleteValue") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

      const usedCount = await prisma.variantAttributeValue.count({
        where: { attributeValueId: id },
      });
      if (usedCount > 0) {
        return NextResponse.json(
          { error: `Este valor esta asignado a ${usedCount} variante(s). Elimine las asignaciones primero.` },
          { status: 400 },
        );
      }

      await prisma.attributeValue.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Accion no reconocida" }, { status: 400 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un registro con ese nombre/valor" }, { status: 409 });
    }
    console.error("Product attributes POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
