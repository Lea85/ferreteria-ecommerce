import { NextResponse } from "next/server";

import {
  CheckoutOrderError,
  createCheckoutOrder,
} from "@/lib/services/checkout-order.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      paymentMethod,
      shippingMethod,
      contactData,
      billingData,
      shippingAddress,
      items,
      subtotal,
    } = body;

    const order = await createCheckoutOrder({
      paymentMethod: paymentMethod || "BANK_TRANSFER",
      shippingMethod: shippingMethod || "STORE_PICKUP",
      contactData,
      billingData,
      shippingAddress,
      items,
      subtotal,
    });

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber });
  } catch (error) {
    if (error instanceof CheckoutOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Checkout confirm:", error);
    return NextResponse.json({ error: "Error al crear el pedido." }, { status: 500 });
  }
}
