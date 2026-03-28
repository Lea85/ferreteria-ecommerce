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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ];
    }

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { products: true } } },
      }),
      prisma.brand.count({ where }),
    ]);

    return NextResponse.json({
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl,
        isActive: b.isActive,
        productCount: b._count.products,
        createdAt: b.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Brands GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const slug = body.slug?.trim() || slugify(name);

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        logoUrl: body.logoUrl || null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ brand });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe una marca con ese slug" }, { status: 409 });
    }
    console.error("Brands POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const data: any = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.slug !== undefined) data.slug = body.slug.trim();
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const brand = await prisma.brand.update({ where: { id }, data });
    return NextResponse.json({ brand });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe una marca con ese slug" }, { status: 409 });
    }
    console.error("Brands PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const prodCount = await prisma.product.count({ where: { brandId: id } });
    if (prodCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${prodCount} producto(s) asociado(s). Desvinculá los productos primero.` },
        { status: 400 },
      );
    }

    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Brands DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
