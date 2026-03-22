import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();

    const { paymentMethod, shippingMethod, contactData, billingData, shippingAddress, items, subtotal } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "El carrito esta vacio." }, { status: 400 });
    }

    const orderNumber = `FS-${Date.now().toString(36).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session?.user?.id || null,
        status: "PENDING",
        paymentMethod: paymentMethod || "BANK_TRANSFER",
        shippingMethod: shippingMethod || "STORE_PICKUP",
        subtotal,
        shippingCost: 0,
        total: subtotal,
        customerName: `${contactData.nombre} ${contactData.apellido}`,
        customerEmail: contactData.email,
        customerPhone: contactData.telefono,
        billingName: `${billingData.nombre} ${billingData.apellido}`,
        billingDoc: billingData.doc,
        billingTaxCondition: billingData.condicionFiscal,
        shippingStreet: shippingAddress?.calle || null,
        shippingFloor: shippingAddress?.piso || null,
        shippingZip: shippingAddress?.cp || null,
        shippingCity: shippingAddress?.localidad || null,
        shippingState: shippingAddress?.provincia || null,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId || null,
            variantId: i.variantId || null,
            productName: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
            subtotal: i.price * i.quantity,
          })),
        },
      },
    });

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber });
  } catch (error) {
    console.error("Checkout confirm:", error);
    return NextResponse.json({ error: "Error al crear el pedido." }, { status: 500 });
  }
}
