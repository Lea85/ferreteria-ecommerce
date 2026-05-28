import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { getOrderById, updateOrderStatus } from "@/lib/services/order.service";

function isAdmin(session: { user?: { role?: string } } | null) {
  return (
    !!session?.user &&
    ["ADMIN", "SUPER_ADMIN"].includes((session.user as { role?: string }).role ?? "")
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        shippingMethod: order.shippingMethod,
        customerType: order.customerType,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        billingName: order.billingName,
        billingDoc: order.billingDoc,
        billingTaxId: order.billingTaxId,
        shippingName: order.shippingName,
        shippingStreet: order.shippingStreet,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingPostalCode: order.shippingPostalCode,
        shippingZip: order.shippingZip,
        shippingPhone: order.shippingPhone,
        transferProofUrl: order.transferProofUrl,
        subtotal: Number(order.subtotal),
        discountTotal: Number(order.discountTotal),
        shippingCost: Number(order.shippingCost),
        taxTotal: Number(order.taxTotal),
        total: Number(order.total),
        notes: order.notes,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((i) => ({
          sku: i.sku,
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
        })),
        statusHistory: order.statusHistory.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          createdAt: h.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Admin order GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!isAdmin(session) || !session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const status = String(body.status ?? "");

    if (!status || !(status in ORDER_STATUS_LABELS)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    await updateOrderStatus(
      id,
      status,
      session.user.id,
      body.note ? String(body.note) : undefined,
    );

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Admin order PATCH error:", error);
    return NextResponse.json({ error: "Error al actualizar estado" }, { status: 500 });
  }
}
