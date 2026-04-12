import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, lastName: true, email: true, phone: true } },
        items: {
          include: {
            variant: {
              select: { stock: true, isActive: true },
            },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Presupuesto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("Admin quote detail:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "sell") {
      const quote = await prisma.quote.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!quote) {
        return NextResponse.json({ error: "Presupuesto no encontrado." }, { status: 404 });
      }

      if (quote.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Solo se pueden vender presupuestos activos." },
          { status: 400 },
        );
      }

      for (const item of quote.items) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stock: true, sku: true },
        });

        if (!variant) {
          return NextResponse.json(
            { error: `Variante no encontrada para SKU ${item.sku}` },
            { status: 400 },
          );
        }

        if (variant.stock < item.quantity) {
          return NextResponse.json(
            { error: `Stock insuficiente para ${item.productName} (SKU: ${item.sku}). Disponible: ${variant.stock}, Requerido: ${item.quantity}` },
            { status: 400 },
          );
        }
      }

      for (const item of quote.items) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const lastOrder = await prisma.order.findFirst({
        orderBy: { createdAt: "desc" },
        select: { orderNumber: true },
      });

      let nextOrderNum = 1;
      if (lastOrder?.orderNumber) {
        const match = lastOrder.orderNumber.match(/FS-(\d+)/);
        if (match) nextOrderNum = parseInt(match[1], 10) + 1;
      }
      const orderNumber = `FS-${String(nextOrderNum).padStart(6, "0")}`;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId: quote.userId,
          status: "DELIVERED",
          shippingMethod: "STORE_PICKUP",
          paymentMethod: "CASH_ON_PICKUP",
          subtotal: quote.subtotal,
          total: quote.total,
          notes: `Venta desde presupuesto ${quote.quoteNumber}`,
          items: {
            create: quote.items.map((item) => ({
              variantId: item.variantId,
              productName: item.productName,
              variantName: item.variantName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
      });

      await prisma.quote.update({
        where: { id },
        data: {
          status: "SOLD",
          soldAt: new Date(),
          soldOrderId: order.id,
        },
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
    }

    if (action === "cancel") {
      await prisma.quote.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    console.error("Admin quote update:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
