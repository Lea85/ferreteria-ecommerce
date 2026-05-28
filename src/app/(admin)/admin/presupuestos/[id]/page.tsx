"use client";

import { ArrowLeft, Ban, Loader2, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { COUNTER_PAYMENT_OPTIONS, type CounterPaymentMethod } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [counterPayment, setCounterPayment] = useState<CounterPaymentMethod>("COUNTER_CASH");
  const [selling, setSelling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/quotes/${id}`)
      .then((r) => r.json())
      .then((data) => setQuote(data.quote))
      .catch(() => toast.error("Error al cargar presupuesto"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSell() {
    setSelling(true);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sell", paymentMethod: counterPayment }),
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
        <Badge variant={STATUS_COLORS[quote.status] as any} className="text-sm">
          {isExpired ? "Vencido" : STATUS_LABELS[quote.status] || quote.status}
        </Badge>
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
                onClick={() => setSellModalOpen(true)}
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
            <Label htmlFor="quote-counter-payment">Medio de pago</Label>
            <Select
              value={counterPayment}
              onValueChange={(v) => setCounterPayment(v as CounterPaymentMethod)}
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
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total a cobrar</span>
              <span className="font-bold">{formatPrice(Number(quote.total))}</span>
            </div>
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
