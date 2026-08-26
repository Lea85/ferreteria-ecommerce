import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
  type CustomerType,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/constants";
import { resolveAdminOrdersBackHref } from "@/lib/admin-orders-list-url";
import { getOrderById } from "@/lib/services/order.service";
import { isCounterPaymentMethod } from "@/lib/services/counter-sale.service";
import { formatPrice } from "@/lib/utils";

import { OrderDetailClient } from "./order-detail-client";
import { OrderPrintButton } from "./order-print-button";

const SHIPPING_METHOD_LABELS: Record<string, string> = {
  STORE_PICKUP: "Retiro en sucursal",
  OWN_DELIVERY: "Envío propio",
  CARRIER: "Correo / transporte",
};

function formatOrderDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatHistoryDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VentaDetallePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const returnToRaw = Array.isArray(query.returnTo)
    ? query.returnTo[0]
    : query.returnTo;
  const backHref = resolveAdminOrdersBackHref({
    get: (key: string) => (key === "returnTo" ? returnToRaw ?? null : null),
  });

  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  const customerType = (order.customerType ?? "CONSUMER") as CustomerType;
  const status = order.status as OrderStatus;
  const paymentMethod = order.paymentMethod as PaymentMethod;
  const isCounterSale = isCounterPaymentMethod(order.paymentMethod);

  const customerName =
    order.customerName ||
    [order.user?.name, order.user?.lastName].filter(Boolean).join(" ") ||
    "—";
  const customerEmail = order.customerEmail || order.user?.email || "—";
  const customerPhone = order.customerPhone || order.user?.phone || "—";
  const taxId = order.billingTaxId || order.billingDoc || null;

  const shippingLabel = SHIPPING_METHOD_LABELS[order.shippingMethod] ?? order.shippingMethod;
  const hasShippingAddress =
    order.shippingName ||
    order.shippingStreet ||
    order.shippingCity;

  const statusHistory = [...order.statusHistory].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Volver al listado de ventas">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <nav className="text-sm text-muted-foreground">
          <Link href={backHref} className="hover:text-primary">
            Ventas
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-foreground">{order.orderNumber}</span>
        </nav>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {order.orderNumber}
            </h2>
            <OrderStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatOrderDate(order.createdAt)}
          </p>
          {order.notes ? (
            <p className="mt-2 text-sm text-muted-foreground">{order.notes}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={backHref}>Volver al listado</Link>
          </Button>
          {isCounterSale ? (
            <OrderPrintButton
              order={{
                orderNumber: order.orderNumber,
                paymentMethod: order.paymentMethod,
                subtotal: Number(order.subtotal),
                discountTotal: Number(order.discountTotal),
                notes: order.notes,
                total: Number(order.total),
                createdAt: order.createdAt.toISOString(),
                items: order.items.map((it) => ({
                  productName: it.productName,
                  variantName: it.variantName,
                  sku: it.sku,
                  quantity: it.quantity,
                  unitPrice: Number(it.unitPrice),
                  subtotal: Number(it.subtotal),
                })),
              }}
            />
          ) : null}
          {status !== "CANCELLED" &&
            status !== "REFUNDED" &&
            status !== "PENDING" &&
            status !== "PAYMENT_PENDING" && (
              <Button variant="outline" asChild>
                <Link href={`/admin/devoluciones?orderId=${order.id}`}>
                  Registrar devolución
                </Link>
              </Button>
            )}
          <OrderDetailClient orderId={order.id} currentStatus={status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-primary">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{customerName}</p>
            <p className="text-muted-foreground">{customerEmail}</p>
            {customerPhone !== "—" ? (
              <p className="text-muted-foreground">{customerPhone}</p>
            ) : null}
            <Badge variant="secondary" className="mt-2">
              {CUSTOMER_TYPE_LABELS[customerType]}
            </Badge>
            {taxId ? (
              <p className="pt-2 text-xs text-muted-foreground">Doc. {taxId}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-primary">Envío</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{shippingLabel}</p>
            {hasShippingAddress ? (
              <>
                {order.shippingName ? (
                  <p className="font-medium">{order.shippingName}</p>
                ) : null}
                <p className="text-muted-foreground">
                  {[order.shippingStreet, order.shippingCity, order.shippingState]
                    .filter(Boolean)
                    .join(", ")}
                  {(order.shippingPostalCode || order.shippingZip)
                    ? ` CP ${order.shippingPostalCode || order.shippingZip}`
                    : ""}
                </p>
                {order.shippingPhone ? (
                  <p className="text-muted-foreground">{order.shippingPhone}</p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">Sin dirección de envío cargada</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-primary">Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod}</p>
            {paymentMethod === "BANK_TRANSFER" && (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-4">
                <p className="text-xs font-medium text-foreground">
                  Comprobante de transferencia
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.transferProofUrl
                    ? "Archivo cargado."
                    : "El cliente aún no subió comprobante."}
                </p>
                {order.transferProofUrl ? (
                  <Button type="button" variant="outline" size="sm" className="mt-3 w-full" asChild>
                    <a href={order.transferProofUrl} target="_blank" rel="noopener noreferrer">
                      Ver comprobante
                    </a>
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Ítems de la venta</CardTitle>
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
              {order.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <p className="font-medium">{it.productName}</p>
                    {it.variantName ? (
                      <p className="text-xs text-muted-foreground">{it.variantName}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{it.sku ?? "—"}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(Number(it.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(Number(it.subtotal))}
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
              <span>{formatPrice(Number(order.subtotal))}</span>
            </div>
            {Number(order.discountTotal) > 0 ? (
              <div className="flex justify-between text-emerald-700">
                <span>Descuentos</span>
                <span>-{formatPrice(Number(order.discountTotal))}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span>{formatPrice(Number(order.shippingCost))}</span>
            </div>
            {Number(order.taxTotal) > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impuestos</span>
                <span>{formatPrice(Number(order.taxTotal))}</span>
              </div>
            ) : null}
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(Number(order.total))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Historial de estado</CardTitle>
        </CardHeader>
        <CardContent>
          {statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin historial registrado.</p>
          ) : (
            <ol className="relative ms-3 border-s border-border ps-6">
              {statusHistory.map((h) => (
                <li key={h.id} className="mb-6 last:mb-0">
                  <span className="absolute -start-[7px] mt-1.5 size-3 rounded-full bg-primary" />
                  <p className="text-sm font-medium text-foreground">
                    {ORDER_STATUS_LABELS[h.toStatus as OrderStatus]}
                    {h.fromStatus ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        (desde {ORDER_STATUS_LABELS[h.fromStatus as OrderStatus]})
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatHistoryDate(h.createdAt)}
                  </p>
                  {h.note ? (
                    <p className="mt-1 text-sm text-muted-foreground">{h.note}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
