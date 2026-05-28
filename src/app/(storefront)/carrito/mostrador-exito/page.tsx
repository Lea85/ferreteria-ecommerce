"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { printCounterSale } from "@/lib/counter-sale-print";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

type OrderData = {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  subtotal: number;
  total: number;
  createdAt: string;
  items: {
    productName: string;
    variantName: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

const STORE_KEYS =
  "store_name,store_address,google_maps_address,store_phone,contact_email,bank_holder";

function MostradorExitoContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [store, setStore] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/checkout/order?id=${orderId}`).then((r) => r.json()),
      fetch(`/api/settings/public?keys=${STORE_KEYS}`).then((r) => r.json()),
    ])
      .then(([orderData, settingsData]) => {
        if (orderData.order) setOrder(orderData.order);
        setStore(settingsData.settings || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  function handlePrint() {
    if (!order) return;
    printCounterSale(order, store);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-muted-foreground">
        Venta no encontrada.
      </div>
    );
  }

  const paymentLabel =
    PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ||
    order.paymentMethod;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-16 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Compra mostrador registrada
        </h1>
        <p className="mt-2 text-muted-foreground">
          La venta fue procesada correctamente. El stock fue actualizado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Comprobante {order.orderNumber}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Medio de pago: </span>
              <span className="font-medium">{paymentLabel}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fecha: </span>
              <span className="font-medium">
                {new Date(order.createdAt).toLocaleString("es-AR")}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-4">
                <span>
                  {item.productName}
                  {item.variantName ? ` — ${item.variantName}` : ""}
                  <span className="text-muted-foreground"> ×{item.quantity}</span>
                </span>
                <span className="shrink-0 font-medium">
                  {formatPrice(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          className="gap-2 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
          onClick={handlePrint}
        >
          <Printer className="size-4" />
          Imprimir resumen
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/pedidos">Ver en pedidos</Link>
        </Button>
        <Button
          asChild
          className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
        >
          <Link href="/productos">Seguir en tienda</Link>
        </Button>
      </div>
    </div>
  );
}

export default function MostradorExitoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MostradorExitoContent />
    </Suspense>
  );
}
