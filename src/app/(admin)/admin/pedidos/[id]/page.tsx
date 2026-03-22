import Link from "next/link";

import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CUSTOMER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

import { OrderDetailClient } from "./order-detail-client";

const MOCK = {
  id: "o1",
  orderNumber: "FER-2026-100801",
  createdAt: "19 de marzo de 2026, 10:42",
  status: "PREPARING" as const,
  paymentMethod: "BANK_TRANSFER" as const,
  customerType: "TRADE" as const,
  customer: {
    name: "Instalaciones Delta SRL",
    email: "compras@deltasanitarios.com.ar",
    phone: "+54 11 5555-0192",
    taxId: "30-71458291-7",
  },
  shipping: {
    name: "Depósito Delta — Avellaneda",
    street: "Av. Mitre 4520",
    city: "Avellaneda",
    state: "Buenos Aires",
    postalCode: "1870",
    phone: "+54 11 5555-0193",
  },
  transferProofUrl: null as string | null,
  items: [
    {
      sku: "PEI-MC-COC-DAL",
      name: "Grifería monocomando cocina Peirano Dalia",
      variant: "Cromo",
      qty: 2,
      unit: 189_900,
      total: 379_800,
    },
    {
      sku: "PVC-32-4",
      name: "Caño PVC presión Ø32 mm x 4 m",
      variant: null as string | null,
      qty: 24,
      unit: 8750,
      total: 210_000,
    },
  ],
  subtotal: 589_800,
  discountTotal: 45_000,
  shippingCost: 12_500,
  total: 557_300,
  statusHistory: [
    {
      at: "19 mar 2026, 10:42",
      from: null as string | null,
      to: "PENDING",
      note: "Pedido creado",
    },
    {
      at: "19 mar 2026, 11:05",
      from: "PENDING",
      to: "PAYMENT_PENDING",
      note: "Cliente subió comprobante",
    },
    {
      at: "19 mar 2026, 14:20",
      from: "PAYMENT_PENDING",
      to: "PAYMENT_APPROVED",
      note: "Validado por admin",
    },
    {
      at: "20 mar 2026, 09:10",
      from: "PAYMENT_APPROVED",
      to: "PREPARING",
      note: "Pick list generado",
    },
  ],
};

type PageProps = { params: Promise<{ id: string }> };

export default async function PedidoDetallePage({ params }: PageProps) {
  await params;
  const order = MOCK;

  return (
    <div className="space-y-8">
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin/pedidos" className="hover:text-primary">
          Pedidos
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-foreground">{order.orderNumber}</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {order.orderNumber}
            </h2>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{order.createdAt}</p>
        </div>
        <OrderDetailClient currentStatus={order.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-primary">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-muted-foreground">{order.customer.email}</p>
            <p className="text-muted-foreground">{order.customer.phone}</p>
            <Badge variant="secondary" className="mt-2">
              {CUSTOMER_TYPE_LABELS[order.customerType]}
            </Badge>
            <p className="pt-2 text-xs text-muted-foreground">
              CUIT {order.customer.taxId}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-primary">Envío</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{order.shipping.name}</p>
            <p className="text-muted-foreground">
              {order.shipping.street}, {order.shipping.city} (
              {order.shipping.state}) CP {order.shipping.postalCode}
            </p>
            <p className="text-muted-foreground">{order.shipping.phone}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-primary">Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
            {order.paymentMethod === "BANK_TRANSFER" && (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-4">
                <p className="text-xs font-medium text-foreground">
                  Comprobante de transferencia
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.transferProofUrl
                    ? "Archivo cargado."
                    : "El cliente aún no subió archivo (simulación)."}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3 w-full">
                  Subir / reemplazar comprobante
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Ítems del pedido</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Unitario</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <p className="font-medium">{it.name}</p>
                    {it.variant && (
                      <p className="text-xs text-muted-foreground">{it.variant}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                  <TableCell className="text-right">{it.qty}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(it.unit)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(it.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row lg:justify-end">
        <Card className="w-full max-w-md border-border shadow-sm lg:ml-auto">
          <CardContent className="space-y-2 pt-6 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Descuentos</span>
              <span>-{formatPrice(order.discountTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span>{formatPrice(order.shippingCost)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Historial de estado</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative ms-3 border-s border-border ps-6">
            {order.statusHistory.map((h, i) => (
              <li key={i} className="mb-6 last:mb-0">
                <span className="absolute -start-[7px] mt-1.5 size-3 rounded-full bg-primary" />
                <p className="text-sm font-medium text-foreground">
                  {ORDER_STATUS_LABELS[h.to as keyof typeof ORDER_STATUS_LABELS]}
                </p>
                <p className="text-xs text-muted-foreground">{h.at}</p>
                {h.note && (
                  <p className="mt-1 text-sm text-muted-foreground">{h.note}</p>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
