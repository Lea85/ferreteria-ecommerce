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

    const variantIds = items
      .map((i: { variantId?: string }) => i.variantId)
      .filter((id: string | undefined): id is string => Boolean(id));

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, stock: true, sku: true, product: { select: { name: true } } },
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const item of items) {
      const variantId = item.variantId as string | undefined;
      const qty = Number(item.quantity) || 0;
      if (!variantId) {
        return NextResponse.json({ error: "Item de carrito invalido." }, { status: 400 });
      }
      const variant = variantMap.get(variantId);
      if (!variant) {
        return NextResponse.json(
          { error: `Variante no encontrada (${item.name ?? variantId}).` },
          { status: 400 },
        );
      }
      if (qty < 1) {
        return NextResponse.json({ error: "Cantidad invalida." }, { status: 400 });
      }
      if (qty > variant.stock) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para "${variant.product.name}" (SKU ${variant.sku}). Disponible: ${variant.stock}.`,
          },
          { status: 400 },
        );
      }
    }

    const orderNumber = `FS-${Date.now().toString(36).toUpperCase()}`;

    const order = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: Number(item.quantity) } },
        });
      }

      return tx.order.create({
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
            create: items.map((i: { productId?: string; variantId?: string; name: string; quantity: number; price: number }) => ({
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
    });

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber });
  } catch (error) {
    console.error("Checkout confirm:", error);
    return NextResponse.json({ error: "Error al crear el pedido." }, { status: 500 });
  }
}
