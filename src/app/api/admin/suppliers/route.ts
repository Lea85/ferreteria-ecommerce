import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma";
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

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
    );

    const where: Prisma.SupplierWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { taxId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          contactName: true,
          email: true,
          phone: true,
          address: true,
          taxId: true,
          notes: true,
          isActive: true,
          createdAt: true,
          _count: { select: { products: true } },
        },
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json({
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        address: s.address,
        taxId: s.taxId,
        notes: s.notes,
        isActive: s.isActive,
        _count: { products: s._count.products },
        createdAt: s.createdAt,
      })),
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Admin suppliers GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactName:
          typeof body.contactName === "string" ? body.contactName.trim() || null : null,
        email: typeof body.email === "string" ? body.email.trim() || null : null,
        phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
        address: typeof body.address === "string" ? body.address.trim() || null : null,
        taxId: typeof body.taxId === "string" ? body.taxId.trim() || null : null,
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Admin suppliers POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    const data: Prisma.SupplierUpdateInput = {};
    if (typeof body.name === "string") {
      const n = body.name.trim();
      if (!n) {
        return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
      }
      data.name = n;
    }
    if ("contactName" in body) {
      data.contactName =
        typeof body.contactName === "string" ? body.contactName.trim() || null : null;
    }
    if ("email" in body) {
      data.email = typeof body.email === "string" ? body.email.trim() || null : null;
    }
    if ("phone" in body) {
      data.phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
    }
    if ("address" in body) {
      data.address = typeof body.address === "string" ? body.address.trim() || null : null;
    }
    if ("taxId" in body) {
      data.taxId = typeof body.taxId === "string" ? body.taxId.trim() || null : null;
    }
    if ("notes" in body) {
      data.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    }
    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Admin suppliers PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() || "";
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }
    console.error("Admin suppliers DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
