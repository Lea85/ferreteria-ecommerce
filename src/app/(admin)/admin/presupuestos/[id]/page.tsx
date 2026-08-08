"use client";

import { ArrowLeft, Ban, Loader2, Printer, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  COUNTER_DISCOUNT_PERCENTS,
  computeCounterDiscountAmount,
} from "@/lib/counter-sale-discount";
import { COUNTER_PAYMENT_OPTIONS, counterPaymentAllowsCustomTotal, type CounterPaymentMethod } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";
import { printQuote, QUOTE_PRINT_STORE_KEYS } from "@/lib/quote-print";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  EXPIRED: "Vencido",
  SOLD: "Vendido",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "default",
  EXPIRED: "secondary",
  SOLD: "outline",
  CANCELLED: "destructive",
};

export default function AdminPresupuestoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [quote, setQuote] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [counterPayment, setCounterPayment] = useState<CounterPaymentMethod>("COUNTER_CASH");
  const [counterDiscountPercent, setCounterDiscountPercent] = useState(0);
  const [counterChargeTotal, setCounterChargeTotal] = useState("");
  const [selling, setSelling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/quotes/${id}`).then((r) => r.json()),
      fetch(`/api/settings/public?keys=${QUOTE_PRINT_STORE_KEYS}`).then((r) =>
        r.json(),
      ),
    ])
      .then(([quoteData, settingsData]) => {
        setQuote(quoteData.quote);
        setStoreSettings(settingsData.settings || {});
      })
      .catch(() => toast.error("Error al cargar presupuesto"))
      .finally(() => setLoading(false));
  }, [id]);

  const quoteSubtotal = Number(quote?.subtotal ?? quote?.total ?? 0);
  const counterSaleAmounts = useMemo(
    () => computeCounterDiscountAmount(quoteSubtotal, counterDiscountPercent),
    [quoteSubtotal, counterDiscountPercent],
  );

  async function handleSell() {
    const chargeTotal = counterPaymentAllowsCustomTotal(counterPayment)
      ? Number(counterChargeTotal)
      : undefined;

    if (
      counterPaymentAllowsCustomTotal(counterPayment) &&
      (!Number.isFinite(chargeTotal) || chargeTotal! <= 0)
    ) {
      toast.error("Indicá un total a cobrar válido para MercadoLibre.");
      return;
    }

    setSelling(true);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sell",
          paymentMethod: counterPayment,
          discountPercent: counterDiscountPercent,
          ...(chargeTotal != null ? { chargeTotal } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al vender");
        return;
      }
      toast.success(`Venta registrada — Pedido ${data.orderNumber}`);
      setSellModalOpen(false);
      router.push(`/carrito/mostrador-exito?orderId=${data.orderId}`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSelling(false);
    }
  }

  async function handleCancel() {
    if (!confirm("¿Cancelar este presupuesto?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (res.ok) {
        toast.success("Presupuesto cancelado");
        router.push("/admin/presupuestos");
      } else {
        toast.error("Error al cancelar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Presupuesto no encontrado.
      </div>
    );
  }

  const isActive = quote.status === "ACTIVE";
  const isExpired = new Date(quote.validUntil) < new Date() && isActive;

  function openSellModal() {
    setCounterDiscountPercent(0);
    setCounterPayment("COUNTER_CASH");
    setCounterChargeTotal(String(quoteSubtotal));
    setSellModalOpen(true);
  }

  function applyQuoteDiscountPercent(percent: number) {
    setCounterDiscountPercent(percent);
    const { totalToCharge } = computeCounterDiscountAmount(quoteSubtotal, percent);
    if (counterPaymentAllowsCustomTotal(counterPayment)) {
      setCounterChargeTotal(String(totalToCharge));
    }
  }

  function handlePrintQuote() {
    if (!quote) return;
    printQuote(
      {
        quoteNumber: quote.quoteNumber,
        createdAt: quote.createdAt,
        validUntil: quote.validUntil,
        subtotal: Number(quote.subtotal),
        total: Number(quote.total),
        items: quote.items.map((item: {
          sku: string;
          productName: string;
          variantName?: string | null;
          quantity: number;
          unitPrice: unknown;
          subtotal: unknown;
        }) => ({
          sku: item.sku,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
        })),
      },
      storeSettings,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/presupuestos">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            Presupuesto {quote.quoteNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            Creado el{" "}
            {new Date(quote.createdAt).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handlePrintQuote}
          >
            <Printer className="size-4" />
            Imprimir
          </Button>
          <Badge variant={STATUS_COLORS[quote.status] as any} className="text-sm">
            {isExpired ? "Vencido" : STATUS_LABELS[quote.status] || quote.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Productos</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-center">Stock actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell>
                        {item.productName}
                        {item.variantName && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({item.variantName})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPrice(Number(item.unitPrice))}
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono">
                        {formatPrice(Number(item.subtotal))}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            item.variant.stock < item.quantity
                              ? "text-destructive font-semibold"
                              : "text-muted-foreground"
                          }
                        >
                          {item.variant.stock}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">
                {[quote.user.name, quote.user.lastName].filter(Boolean).join(" ")}
              </p>
              <p className="text-muted-foreground">{quote.user.email}</p>
              {quote.user.phone && (
                <p className="text-muted-foreground">Tel: {quote.user.phone}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Totales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatPrice(Number(quote.subtotal))}</span>
              </div>
              {Number(quote.subtotal) - Number(quote.total) > 0 ? (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>{quote.notes || "Descuento"}</span>
                  <span className="font-mono">
                    −{formatPrice(Number(quote.subtotal) - Number(quote.total))}
                  </span>
                </div>
              ) : null}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary font-mono">
                  {formatPrice(Number(quote.total))}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Validez</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className={isExpired ? "text-destructive font-semibold" : "text-muted-foreground"}>
                {isExpired ? "VENCIDO - " : ""}
                Válido hasta{" "}
                {new Date(quote.validUntil).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </CardContent>
          </Card>

          {isActive && (
            <div className="space-y-3">
              <Button
                className="w-full gap-2 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                onClick={openSellModal}
                disabled={selling}
              >
                <ShoppingCart className="size-4" />
                Vender presupuesto
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive hover:text-destructive"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Ban className="size-4" />
                )}
                {cancelling ? "Cancelando..." : "Cancelar presupuesto"}
              </Button>
            </div>
          )}

          {quote.status === "SOLD" && quote.soldOrderId && (
            <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
              <CardContent className="py-4 text-center">
                <p className="text-sm font-semibold text-emerald-700">
                  Vendido
                </p>
                <Link
                  href={`/admin/pedidos/${quote.soldOrderId}`}
                  className="text-sm text-emerald-600 underline"
                >
                  Ver venta asociada
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={sellModalOpen} onOpenChange={setSellModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vender presupuesto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Seleccioná el medio de pago. Se registrará la venta en mostrador, se
            descontará el stock y el presupuesto quedará como vendido.
          </p>
          <div className="space-y-2">
            <Label htmlFor="quote-counter-discount">Descuento</Label>
            <Select
              value={String(counterDiscountPercent)}
              onValueChange={(v) => applyQuoteDiscountPercent(Number(v))}
            >
              <SelectTrigger id="quote-counter-discount" className="w-full">
                <SelectValue placeholder="Sin descuento" />
              </SelectTrigger>
              <SelectContent>
                {COUNTER_DISCOUNT_PERCENTS.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    {p === 0 ? "0% (sin descuento)" : `${p}%`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-counter-payment">Medio de pago</Label>
            <Select
              value={counterPayment}
              onValueChange={(v) => {
                const method = v as CounterPaymentMethod;
                setCounterPayment(method);
                if (counterPaymentAllowsCustomTotal(method)) {
                  setCounterChargeTotal(String(counterSaleAmounts.totalToCharge));
                }
              }}
            >
              <SelectTrigger id="quote-counter-payment" className="w-full">
                <SelectValue placeholder="Elegir medio de pago" />
              </SelectTrigger>
              <SelectContent>
                {COUNTER_PAYMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-2">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatPrice(quoteSubtotal)}</span>
            </div>
            {counterDiscountPercent > 0 ? (
              <div className="flex justify-between gap-3 text-emerald-700">
                <span>Descuento ({counterDiscountPercent}%)</span>
                <span className="font-medium">
                  −{formatPrice(counterSaleAmounts.discountAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
              <span className="font-semibold text-foreground">Total a cobrar</span>
              {counterPaymentAllowsCustomTotal(counterPayment) ? (
                <Input
                  id="quote-counter-charge-total"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  className="h-9 w-36 text-right font-bold"
                  value={counterChargeTotal}
                  onChange={(e) => setCounterChargeTotal(e.target.value)}
                />
              ) : (
                <span className="text-lg font-bold">
                  {formatPrice(counterSaleAmounts.totalToCharge)}
                </span>
              )}
            </div>
            {counterPaymentAllowsCustomTotal(counterPayment) ? (
              <p className="text-xs text-muted-foreground">
                Referencia con descuento:{" "}
                {formatPrice(counterSaleAmounts.totalToCharge)}. Podés ajustar el
                monto cobrado por MercadoLibre.
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSellModalOpen(false)}
              disabled={selling}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
              onClick={handleSell}
              disabled={selling}
            >
              {selling ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Procesando…
                </>
              ) : (
                "Confirmar venta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
