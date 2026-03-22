"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Copy, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";

type OrderData = {
  id: string; orderNumber: string; status: string;
  customerName: string | null; customerEmail: string | null; customerPhone: string | null;
  billingName: string | null; billingDoc: string | null; billingTaxCondition: string | null;
  shippingMethod: string; paymentMethod: string;
  shippingStreet: string | null; shippingCity: string | null; shippingState: string | null; shippingZip: string | null;
  subtotal: number; total: number;
  createdAt: string;
  items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  bank?: { bank_name: string; bank_cbu: string; bank_alias: string; bank_holder: string; bank_email: string };
};

function ExitoContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }

    Promise.all([
      fetch(`/api/checkout/order?id=${orderId}`).then((r) => r.json()),
      fetch("/api/settings/public?keys=bank_name,bank_cbu,bank_alias,bank_holder,bank_email").then((r) => r.json()),
    ]).then(([orderData, settingsData]) => {
      if (orderData.order) {
        setOrder({ ...orderData.order, bank: settingsData.settings || {} });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orderId]);

  function copyOrderNumber() {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="py-16 text-center text-muted-foreground">Pedido no encontrado.</div>;

  const isTransfer = order.paymentMethod === "BANK_TRANSFER";
  const isPickup = order.shippingMethod === "STORE_PICKUP";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Pedido confirmado</h1>
        <p className="mt-2 text-muted-foreground">Gracias por tu compra. Tu pedido fue registrado correctamente.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pedido {order.orderNumber}</CardTitle>
          <Button variant="outline" size="sm" className="gap-2" onClick={copyOrderNumber}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado" : "Copiar nro."}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Estado:</span> <Badge className="ml-2">Pendiente</Badge></div>
            <div><span className="text-muted-foreground">Fecha:</span> <span className="ml-2">{new Date(order.createdAt).toLocaleString("es-AR")}</span></div>
            <div><span className="text-muted-foreground">Envio:</span> <span className="ml-2">{isPickup ? "Retiro en tienda" : "Envio a domicilio"}</span></div>
            <div><span className="text-muted-foreground">Pago:</span> <span className="ml-2">{isTransfer ? "Transferencia bancaria" : "Mercado Pago"}</span></div>
          </div>

          <Separator />

          <div className="text-sm space-y-1">
            <p className="font-semibold">Datos de contacto</p>
            <p>{order.customerName}</p>
            <p className="text-muted-foreground">{order.customerEmail} | {order.customerPhone}</p>
          </div>

          {!isPickup && order.shippingStreet && (
            <>
              <Separator />
              <div className="text-sm space-y-1">
                <p className="font-semibold">Direccion de envio</p>
                <p>{order.shippingStreet}{order.shippingCity ? `, ${order.shippingCity}` : ""}{order.shippingState ? `, ${order.shippingState}` : ""}{order.shippingZip ? ` - CP ${order.shippingZip}` : ""}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalle del pedido</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{item.productName} x{item.quantity}</span>
                <span className="font-medium">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span>
            <span className="text-primary text-lg">{formatPrice(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      {isTransfer && order.bank && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader><CardTitle className="text-base text-amber-900">Datos para transferencia</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{order.bank.bank_name || "Banco Galicia"}</p>
            <p className="font-mono text-xs">CBU: {order.bank.bank_cbu || "00701234-0000000000123456"}</p>
            <p className="font-mono text-xs">Alias: {order.bank.bank_alias || "FERROSAN.VENTAS"}</p>
            {order.bank.bank_holder && <p className="text-xs">Titular: {order.bank.bank_holder}</p>}
            <p className="text-xs text-amber-800 mt-3">
              Envia el comprobante a <strong>{order.bank.bank_email || "ventas@ferrosan.com.ar"}</strong> indicando el numero de pedido <strong>{order.orderNumber}</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="outline"><Link href="/mi-cuenta/pedidos">Ver mis pedidos</Link></Button>
        <Button asChild className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"><Link href="/productos">Seguir comprando</Link></Button>
      </div>
    </div>
  );
}

export default function CheckoutExitoPage() {
  return <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}><ExitoContent /></Suspense>;
}
