import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { select: { productName: true, quantity: true, unitPrice: true, subtotal: true } },
      },
    });

    if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        billingName: order.billingName,
        billingDoc: order.billingDoc,
        billingTaxCondition: order.billingTaxCondition,
        shippingMethod: order.shippingMethod,
        paymentMethod: order.paymentMethod,
        shippingStreet: order.shippingStreet,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingZip: order.shippingZip,
        subtotal: Number(order.subtotal),
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
        })),
      },
    });
  } catch (error) {
    console.error("Order GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
