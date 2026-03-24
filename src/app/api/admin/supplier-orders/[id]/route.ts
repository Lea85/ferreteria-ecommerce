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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;

    const order = await prisma.supplierOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            productName: true,
            sku: true,
            requestedQty: true,
            receivedQty: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const variantIds = order.items
      .map((i) => i.variantId)
      .filter((v): v is string => !!v);

    const variants =
      variantIds.length > 0
        ? await prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, stock: true },
          })
        : [];

    const stockMap = new Map(variants.map((v) => [v.id, v.stock]));

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        notes: order.notes,
        supplierId: order.supplierId,
        supplierName: order.supplier?.name || "Todos",
        items: order.items.map((item) => ({
          ...item,
          currentStock: item.variantId ? stockMap.get(item.variantId) ?? 0 : 0,
        })),
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Supplier order GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();

    const order = await prisma.supplierOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (body.action === "receive" && Array.isArray(body.items)) {
      for (const incoming of body.items) {
        const item = order.items.find((i) => i.id === incoming.id);
        if (!item) continue;

        const newReceivedQty = Math.max(0, Math.floor(incoming.receivedQty || 0));
        const delta = newReceivedQty - item.receivedQty;

        await prisma.supplierOrderItem.update({
          where: { id: item.id },
          data: { receivedQty: newReceivedQty },
        });

        if (delta !== 0 && item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: delta } },
          });
        }
      }

      const updatedItems = await prisma.supplierOrderItem.findMany({
        where: { supplierOrderId: id },
      });

      const allReceived = updatedItems.every((i) => i.receivedQty >= i.requestedQty);
      const newStatus = allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";

      await prisma.supplierOrder.update({
        where: { id },
        data: { status: newStatus as "RECEIVED" | "PARTIALLY_RECEIVED" },
      });

      return NextResponse.json({ success: true, status: newStatus });
    }

    const data: { status?: string; notes?: string } = {};
    if (body.status) data.status = body.status;
    if ("notes" in body) data.notes = body.notes || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin datos para actualizar" }, { status: 400 });
    }

    await prisma.supplierOrder.update({
      where: { id },
      data: data as { status?: "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED"; notes?: string | null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supplier order PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
