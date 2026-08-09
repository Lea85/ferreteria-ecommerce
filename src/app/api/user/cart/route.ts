import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ServerCartItem = {
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  stock: number;
  variantLabel?: string;
  sku?: string;
};

const cartItemInclude = {
  variant: {
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      stock: true,
      isActive: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          images: {
            select: { url: true },
            orderBy: { position: "asc" as const },
            take: 1,
          },
        },
      },
      attributes: {
        select: { attributeValue: { select: { value: true } } },
      },
    },
  },
} as const;

type CartRowWithVariant = {
  quantity: number;
  variant: {
    id: string;
    sku: string;
    name: string | null;
    price: unknown;
    stock: number;
    isActive: boolean;
    product: {
      id: string;
      name: string;
      slug: string;
      isActive: boolean;
      images: { url: string }[];
    };
    attributes: { attributeValue: { value: string } }[];
  };
};

function mapRowToItem(row: CartRowWithVariant): ServerCartItem {
  const v = row.variant;
  const label = v.attributes.map((a) => a.attributeValue.value).join(" · ");
  return {
    variantId: v.id,
    productId: v.product.id,
    name: v.product.name,
    slug: v.product.slug,
    image: v.product.images[0]?.url ?? "",
    price: Number(v.price),
    quantity: row.quantity,
    stock: v.stock,
    variantLabel: label || v.name || "",
    sku: v.sku,
  };
}

async function getUserId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function loadCart(userId: string): Promise<ServerCartItem[]> {
  const rows = await prisma.cartItem.findMany({
    where: { userId },
    include: cartItemInclude,
    orderBy: { createdAt: "asc" },
  });

  return rows
    .filter(
      (r) =>
        r.variant.isActive &&
        r.variant.product.isActive &&
        r.quantity > 0,
    )
    .map((r) => mapRowToItem(r as unknown as CartRowWithVariant));
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ items: [] as ServerCartItem[] });
    }
    const items = await loadCart(userId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("User cart GET error:", error);
    return NextResponse.json({ items: [] as ServerCartItem[] });
  }
}

type IncomingItem = { variantId: string; quantity: number };

function normalizeIncoming(raw: unknown): IncomingItem[] {
  if (!Array.isArray(raw)) return [];
  const byVariant = new Map<string, number>();
  for (const entry of raw) {
    const variantId =
      typeof (entry as { variantId?: unknown })?.variantId === "string"
        ? (entry as { variantId: string }).variantId.trim()
        : "";
    if (!variantId) continue;
    const qtyRaw = Number((entry as { quantity?: unknown })?.quantity);
    const qty = Number.isFinite(qtyRaw) ? Math.floor(qtyRaw) : 0;
    if (qty < 1) continue;
    byVariant.set(variantId, (byVariant.get(variantId) ?? 0) + qty);
  }
  return [...byVariant.entries()].map(([variantId, quantity]) => ({
    variantId,
    quantity,
  }));
}

/**
 * Reemplaza (mode="replace") o fusiona (mode="merge") el carrito del usuario.
 * Devuelve el carrito enriquecido para que el cliente lo hidrate.
 */
export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      items?: unknown;
      mode?: unknown;
    };
    const mode = body.mode === "merge" ? "merge" : "replace";
    const incoming = normalizeIncoming(body.items);

    // Solo variantes existentes y activas.
    const variantIds = incoming.map((i) => i.variantId);
    const validVariants =
      variantIds.length > 0
        ? await prisma.productVariant.findMany({
            where: { id: { in: variantIds }, isActive: true },
            select: { id: true },
          })
        : [];
    const validIds = new Set(validVariants.map((v) => v.id));
    const valid = incoming.filter((i) => validIds.has(i.variantId));

    await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        await tx.cartItem.deleteMany({
          where: {
            userId,
            variantId: { notIn: valid.map((i) => i.variantId) },
          },
        });
        for (const item of valid) {
          await tx.cartItem.upsert({
            where: { userId_variantId: { userId, variantId: item.variantId } },
            create: {
              userId,
              variantId: item.variantId,
              quantity: item.quantity,
            },
            update: { quantity: item.quantity },
          });
        }
      } else {
        for (const item of valid) {
          const existing = await tx.cartItem.findUnique({
            where: {
              userId_variantId: { userId, variantId: item.variantId },
            },
            select: { quantity: true },
          });
          const nextQty = (existing?.quantity ?? 0) + item.quantity;
          await tx.cartItem.upsert({
            where: {
              userId_variantId: { userId, variantId: item.variantId },
            },
            create: {
              userId,
              variantId: item.variantId,
              quantity: item.quantity,
            },
            update: { quantity: nextQty },
          });
        }
      }
    });

    const items = await loadCart(userId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("User cart PUT error:", error);
    return NextResponse.json(
      { error: "Error al guardar el carrito" },
      { status: 500 },
    );
  }
}
