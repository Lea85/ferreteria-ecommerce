"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Package, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", PAYMENT_PENDING: "Pago pendiente", PAYMENT_APPROVED: "Pago aprobado",
  PREPARING: "Preparando", SHIPPED: "Enviado", DELIVERED: "Entregado", CANCELLED: "Cancelado",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline", PAYMENT_PENDING: "outline", PAYMENT_APPROVED: "secondary",
  PREPARING: "secondary", SHIPPED: "default", DELIVERED: "default", CANCELLED: "destructive",
};

type OrderItem = { name: string; quantity: number; price: number; subtotal: number };
type Order = { id: string; orderNumber: string; status: string; total: number; createdAt: string; itemCount: number; items: OrderItem[] };

export default function MisPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingBag className="size-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold text-foreground">Aun no tenes pedidos</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cuando realices una compra, tus pedidos apareceran aca.</p>
        <Button asChild className="mt-6"><Link href="/productos">Ir a la tienda</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mis pedidos</h1>
        <p className="text-sm text-muted-foreground">{orders.length} pedido{orders.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="space-y-4">
        {orders.map((o) => (
          <Card key={o.id} className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-mono text-primary">{o.orderNumber}</CardTitle>
                <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[o.status] || "outline"}>{STATUS_LABELS[o.status] || o.status}</Badge>
                <span className="text-base font-bold">{formatPrice(o.total)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {o.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="size-4 text-muted-foreground" />
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    </div>
                    <span className="text-muted-foreground">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
