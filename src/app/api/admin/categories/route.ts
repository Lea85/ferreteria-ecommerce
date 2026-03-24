import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const categories = await prisma.category.findMany({
      orderBy: [{ parentId: "asc" }, { position: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        parentId: c.parentId,
        position: c.position,
        isActive: c.isActive,
        metaTitle: c.metaTitle,
        metaDesc: c.metaDesc,
        productCount: c._count.products,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Admin categories GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      imageUrl,
      parentId,
      isActive,
    } = body as {
      name?: string;
      slug?: string;
      description?: string | null;
      imageUrl?: string | null;
      parentId?: string | null;
      isActive?: boolean;
    };

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { error: "name y slug son obligatorios" },
        { status: 400 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        description: description ?? undefined,
        imageUrl: imageUrl ?? undefined,
        parentId: parentId || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "El slug ya está en uso" },
          { status: 409 },
        );
      }
    }
    console.error("Admin categories POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      name,
      slug,
      description,
      imageUrl,
      parentId,
      isActive,
      position,
      metaTitle,
      metaDesc,
    } = body as {
      id?: string;
      name?: string;
      slug?: string;
      description?: string | null;
      imageUrl?: string | null;
      parentId?: string | null;
      isActive?: boolean;
      position?: number;
      metaTitle?: string | null;
      metaDesc?: string | null;
    };

    if (!id) {
      return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
    }

    const data: Prisma.CategoryUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) data.description = description;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (parentId !== undefined) data.parent = parentId ? { connect: { id: parentId } } : { disconnect: true };
    if (isActive !== undefined) data.isActive = isActive;
    if (position !== undefined) data.position = position;
    if (metaTitle !== undefined) data.metaTitle = metaTitle;
    if (metaDesc !== undefined) data.metaDesc = metaDesc;

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "El slug ya está en uso" },
          { status: 409 },
        );
      }
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Categoría no encontrada" },
          { status: 404 },
        );
      }
    }
    console.error("Admin categories PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
    }

    const [productLinks, childCount] = await Promise.all([
      prisma.productCategory.count({ where: { categoryId: id } }),
      prisma.category.count({ where: { parentId: id } }),
    ]);

    if (productLinks > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: hay productos en esta categoría" },
        { status: 409 },
      );
    }

    if (childCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: hay subcategorías" },
        { status: 409 },
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Categoría no encontrada" },
          { status: 404 },
        );
      }
    }
    console.error("Admin categories DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
