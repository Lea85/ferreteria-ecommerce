import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  mapProductToCard,
  productCardInclude,
} from "@/lib/product-card-map";

async function getUserIdFromSession(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json({ favoriteIds: [], products: [] });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { productId: true },
    });

    const favoriteIds = favorites.map((f) => f.productId);
    if (favoriteIds.length === 0) {
      return NextResponse.json({ favoriteIds: [], products: [] });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: favoriteIds }, isActive: true },
      include: productCardInclude,
    });

    const byId = new Map(products.map((p) => [p.id, p]));
    const ordered = favoriteIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map(mapProductToCard);

    return NextResponse.json({ favoriteIds, products: ordered });
  } catch (error) {
    console.error("User favorites GET error:", error);
    return NextResponse.json({ favoriteIds: [], products: [] });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json(
        { error: "Tenés que iniciar sesión para guardar favoritos" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const productId =
      typeof body?.productId === "string" ? body.productId.trim() : "";
    if (!productId) {
      return NextResponse.json({ error: "productId requerido" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    await prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });

    return NextResponse.json({ ok: true, productId, favorited: true });
  } catch (error) {
    console.error("User favorites POST error:", error);
    return NextResponse.json({ error: "Error al guardar favorito" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json(
        { error: "Tenés que iniciar sesión" },
        { status: 401 },
      );
    }

    const productId = new URL(request.url).searchParams.get("productId")?.trim();
    if (!productId) {
      return NextResponse.json({ error: "productId requerido" }, { status: 400 });
    }

    await prisma.favorite.deleteMany({
      where: { userId, productId },
    });

    return NextResponse.json({ ok: true, productId, favorited: false });
  } catch (error) {
    console.error("User favorites DELETE error:", error);
    return NextResponse.json({ error: "Error al quitar favorito" }, { status: 500 });
  }
}
