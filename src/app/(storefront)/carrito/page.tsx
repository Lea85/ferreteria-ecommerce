"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, ShoppingBag, Store, Trash2 } from "lucide-react";

import { QuantityControls } from "@/components/storefront/QuantityControls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  COUNTER_ROUNDING_OPTIONS,
  computeCounterSaleTotals,
  DEFAULT_ROUNDING_MULTIPLE,
  roundMoney,
  type CounterRoundingMode,
} from "@/lib/counter-sale-discount";
import { COUNTER_PAYMENT_OPTIONS, counterPaymentAllowsCustomTotal, type CounterPaymentMethod } from "@/lib/constants";
import {
  computeBestCategoryDiscount,
  type AppliedDiscount,
  type CategoryBenefit,
} from "@/lib/customer-category-discount";
import { printQuote } from "@/lib/quote-print";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStockSync } from "@/hooks/use-cart-stock-sync";
import {
  cartHasOverStock,
  toastCheckoutBlockedOverStock,
} from "@/lib/cart-stock";
import { useCartStore } from "@/stores/cart.store";
import { toast } from "sonner";

export default function CarritoPage() {
  useCartStockSync();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const adminStockBypass = useCartStore((s) => s.adminStockBypass);
  const hasOverStock = cartHasOverStock(items);

  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);
  const [categoryBenefits, setCategoryBenefits] = useState<CategoryBenefit[]>([]);
  const [canGenerateQuotes, setCanGenerateQuotes] = useState(false);
  const [canCounterSale, setCanCounterSale] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [counterPayment, setCounterPayment] = useState<CounterPaymentMethod>("COUNTER_CASH");
  const [counterDiscountPercent, setCounterDiscountPercent] = useState(0);
  const [roundingMode, setRoundingMode] = useState<CounterRoundingMode>("none");
  const [roundingMultiple, setRoundingMultiple] = useState(
    String(DEFAULT_ROUNDING_MULTIPLE),
  );
  const [roundingManualTotal, setRoundingManualTotal] = useState("");
  const [counterChargeTotal, setCounterChargeTotal] = useState("");
  const [processingCounterSale, setProcessingCounterSale] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/quotes?checkPermission=true").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/admin/counter-sale?checkPermission=true").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/user/discount").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([quotesData, counterData, discountData]) => {
        if (quotesData?.canGenerateQuotes) setCanGenerateQuotes(true);
        if (counterData?.canCounterSale) setCanCounterSale(true);
        if (Array.isArray(discountData?.benefits)) {
          setCategoryBenefits(discountData.benefits);
        }
      })
      .catch(() => {});
  }, []);

  async function handleCounterSale() {
    if (items.length === 0) return;

    try {
      const totalsPreview = computeCounterSaleTotals(
        summary.subtotal,
        counterDiscountPercent,
        {
          mode: roundingMode,
          multiple:
            roundingMode === "multiple"
              ? Number(roundingMultiple)
              : undefined,
          manualTotal:
            roundingMode === "manual"
              ? Number(roundingManualTotal)
              : undefined,
        },
      );

      if (
        roundingMode === "manual" &&
        Number(roundingManualTotal) >= totalsPreview.totalAfterDiscount
      ) {
        toast.error(
          "El total manual debe ser menor al importe con el descuento aplicado.",
        );
        return;
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Datos de redondeo inválidos.",
      );
      return;
    }

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

    setProcessingCounterSale(true);
    try {
      const res = await fetch("/api/admin/counter-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: counterPayment,
          discountPercent: counterDiscountPercent,
          roundingMode,
          ...(roundingMode === "multiple"
            ? { roundingMultiple: Number(roundingMultiple) }
            : {}),
          ...(roundingMode === "manual"
            ? { roundingManualTotal: Number(roundingManualTotal) }
            : {}),
          ...(chargeTotal != null ? { chargeTotal } : {}),
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al registrar la venta");
        return;
      }

      clearCart();
      setCounterModalOpen(false);
      toast.success(`Venta ${data.order.orderNumber} registrada`);
      router.push(`/carrito/mostrador-exito?orderId=${data.order.id}`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setProcessingCounterSale(false);
    }
  }

  async function handleGenerateQuote() {
    if (items.length === 0) return;
    setGeneratingQuote(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al generar presupuesto");
        return;
      }

      toast.success(`Presupuesto ${data.quote.quoteNumber} generado`);

      printQuote(
        {
          quoteNumber: data.quote.quoteNumber,
          createdAt: data.quote.createdAt,
          validUntil: data.quote.validUntil,
          subtotal: Number(data.quote.subtotal),
          total: Number(data.quote.total),
          discountLabel: data.discount?.label ?? null,
          items: data.quote.items.map((item: {
            sku: string;
            productName: string;
            variantName?: string | null;
            quantity: number;
            unitPrice: number;
            subtotal: number;
          }) => ({
            sku: item.sku,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.subtotal),
          })),
        },
        data.storeSettings || {},
      );
    } catch {
      toast.error("Error al generar presupuesto");
    } finally {
      setGeneratingQuote(false);
    }
  }

  const subtotal = getSubtotal();
  const totalQuantity = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const categoryDiscount: AppliedDiscount | null = useMemo(
    () => computeBestCategoryDiscount(categoryBenefits, subtotal, totalQuantity),
    [categoryBenefits, subtotal, totalQuantity],
  );

  const couponDiscount = applied ? Math.round(subtotal * 0.05) : 0;
  const discount = (categoryDiscount?.amount ?? 0) + couponDiscount;
  const shippingNote = "A calcular";
  const total = Math.max(0, subtotal - discount);

  const empty = items.length === 0;

  const summary = useMemo(
    () => ({ subtotal, discount, total }),
    [subtotal, discount, total],
  );

  const counterSaleAmounts = useMemo(() => {
    try {
      return computeCounterSaleTotals(summary.subtotal, counterDiscountPercent, {
        mode: roundingMode,
        multiple:
          roundingMode === "multiple" ? Number(roundingMultiple) : undefined,
        manualTotal:
          roundingMode === "manual" ? Number(roundingManualTotal) : undefined,
      });
    } catch {
      return computeCounterSaleTotals(summary.subtotal, counterDiscountPercent, {
        mode: "none",
      });
    }
  }, [
    summary.subtotal,
    counterDiscountPercent,
    roundingMode,
    roundingMultiple,
    roundingManualTotal,
  ]);

  function syncChargeTotalFromTotals(
    totals: ReturnType<typeof computeCounterSaleTotals>,
  ) {
    if (counterPaymentAllowsCustomTotal(counterPayment)) {
      setCounterChargeTotal(String(totals.finalTotal));
    }
  }

  function openCounterSaleModal() {
    setCounterDiscountPercent(0);
    setRoundingMode("none");
    setRoundingMultiple(String(DEFAULT_ROUNDING_MULTIPLE));
    setRoundingManualTotal("");
    setCounterPayment("COUNTER_CASH");
    setCounterChargeTotal(String(summary.subtotal));
    setCounterModalOpen(true);
  }

  function applyCounterDiscountPercent(percent: number) {
    setCounterDiscountPercent(percent);
    const totals = computeCounterSaleTotals(summary.subtotal, percent, {
      mode: roundingMode,
      multiple:
        roundingMode === "multiple" ? Number(roundingMultiple) : undefined,
      manualTotal:
        roundingMode === "manual" ? Number(roundingManualTotal) : undefined,
    });
    syncChargeTotalFromTotals(totals);
  }

  function applyRoundingMode(mode: CounterRoundingMode) {
    let manualValue = roundingManualTotal;
    if (mode === "manual" && !manualValue) {
      const afterDiscount = computeCounterSaleTotals(
        summary.subtotal,
        counterDiscountPercent,
        { mode: "none" },
      ).totalAfterDiscount;
      const suggested =
        afterDiscount > 1
          ? roundMoney(Math.floor(afterDiscount - 1))
          : roundMoney(afterDiscount / 2);
      manualValue = String(suggested);
      setRoundingManualTotal(manualValue);
    }
    setRoundingMode(mode);
    const totals = computeCounterSaleTotals(summary.subtotal, counterDiscountPercent, {
      mode,
      multiple: mode === "multiple" ? Number(roundingMultiple) : undefined,
      manualTotal: mode === "manual" ? Number(manualValue) : undefined,
    });
    syncChargeTotalFromTotals(totals);
  }

  if (empty) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <ShoppingBag className="size-16 text-muted-foreground" />
        <h1 className="mt-6 text-2xl font-bold text-foreground">
          Tu carrito está vacío
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Explorá el catálogo y agregá productos para armar tu pedido.
        </p>
        <Button
          asChild
          className="mt-8 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
        >
          <Link href="/productos">Ver productos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Carrito de compras
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Revisá los productos antes de finalizar.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((line) => (
            <div
              key={line.variantId}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row"
            >
              <Link
                href={`/productos/${line.slug}`}
                className="relative mx-auto size-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:mx-0"
              >
                <Image
                  src={line.image}
                  alt=""
                  fill
                  unoptimized={line.image.startsWith("http")}
                  className="object-cover"
                  sizes="112px"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/productos/${line.slug}`}
                  className="font-semibold text-foreground hover:text-primary"
                >
                  {line.name}
                </Link>
                {line.variantLabel ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {line.variantLabel}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">
                  Precio unitario:{" "}
                  <span className="font-medium text-foreground">
                    {formatPrice(line.price)}
                  </span>
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <QuantityControls
                    value={line.quantity}
                    maxStock={line.stock}
                    ignoreStockLimit={adminStockBypass}
                    onChange={(q) => updateQuantity(line.variantId, q)}
                  />
                  {line.quantity > line.stock ? (
                    <span className="text-xs text-amber-700">
                      Stock: {line.stock} u. — superás el disponible
                    </span>
                  ) : line.stock > 0 && line.quantity >= line.stock && !adminStockBypass ? (
                    <span className="text-xs text-amber-700">Máx. {line.stock} u.</span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeItem(line.variantId)}
                  >
                    <Trash2 className="mr-1 size-4" />
                    Quitar
                  </Button>
                  <span className="ml-auto text-lg font-bold text-primary">
                    {formatPrice(line.price * line.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">
              Cupón de descuento
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Código"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setApplied(Boolean(coupon.trim()))}
              >
                Aplicar
              </Button>
            </div>
            {applied ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Cupón aplicado (demo: 5% off).
              </p>
            ) : null}
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-foreground">Resumen</h2>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                {formatPrice(summary.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {categoryDiscount ? categoryDiscount.label : "Descuento"}
              </span>
              <span
                className={cn(
                  "font-medium",
                  summary.discount > 0 && "text-emerald-600",
                )}
              >
                {summary.discount > 0
                  ? `-${formatPrice(summary.discount)}`
                  : formatPrice(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span className="font-medium">{shippingNote}</span>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatPrice(summary.total)}</span>
          </div>
          {adminStockBypass && hasOverStock ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Hay ítems sin stock suficiente para la compra web. Podés generar presupuesto o
              registrar venta por mostrador.
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-6 w-full bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
            onClick={() => {
              if (hasOverStock) {
                toastCheckoutBlockedOverStock();
                return;
              }
              router.push("/checkout/datos");
            }}
          >
            Finalizar compra
          </Button>
          {canCounterSale && (
            <Button
              type="button"
              className="mt-3 w-full gap-2 border border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
              onClick={openCounterSaleModal}
            >
              <Store className="size-4" />
              Compra Mostrador
            </Button>
          )}
          {canGenerateQuotes && (
            <Button
              variant="outline"
              className="mt-3 w-full gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={handleGenerateQuote}
              disabled={generatingQuote}
            >
              {generatingQuote ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              {generatingQuote ? "Generando..." : "Generar presupuesto"}
            </Button>
          )}
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href="/productos">Continuar comprando</Link>
          </Button>
        </aside>
      </div>

      <Dialog open={counterModalOpen} onOpenChange={setCounterModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compra Mostrador</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Seleccioná el medio de pago utilizado. La venta se registrará y
            descontará el stock al confirmar.
          </p>
          <div className="space-y-2">
            <Label htmlFor="counter-discount">Descuento</Label>
            <Select
              value={String(counterDiscountPercent)}
              onValueChange={(v) => applyCounterDiscountPercent(Number(v))}
            >
              <SelectTrigger id="counter-discount" className="w-full">
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
            <Label htmlFor="counter-payment">Medio de pago</Label>
            <Select
              value={counterPayment}
              onValueChange={(v) => {
                const method = v as CounterPaymentMethod;
                setCounterPayment(method);
                if (counterPaymentAllowsCustomTotal(method)) {
                  setCounterChargeTotal(String(counterSaleAmounts.finalTotal));
                }
              }}
            >
              <SelectTrigger id="counter-payment" className="w-full">
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
          <div className="space-y-2">
            <Label htmlFor="counter-rounding">Redondeo</Label>
            <Select
              value={roundingMode}
              onValueChange={(v) => applyRoundingMode(v as CounterRoundingMode)}
            >
              <SelectTrigger id="counter-rounding" className="w-full">
                <SelectValue placeholder="Sin redondeo" />
              </SelectTrigger>
              <SelectContent>
                {COUNTER_ROUNDING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {roundingMode === "multiple" ? (
            <div className="space-y-2">
              <Label htmlFor="rounding-multiple">Múltiplo de redondeo</Label>
              <Input
                id="rounding-multiple"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={roundingMultiple}
                onChange={(e) => {
                  setRoundingMultiple(e.target.value);
                  const totals = computeCounterSaleTotals(
                    summary.subtotal,
                    counterDiscountPercent,
                    {
                      mode: "multiple",
                      multiple: Number(e.target.value),
                    },
                  );
                  syncChargeTotalFromTotals(totals);
                }}
              />
              <p className="text-xs text-muted-foreground">
                El total baja al múltiplo inferior (ej. 321,13 con 50 → 300,00).
              </p>
            </div>
          ) : null}
          {roundingMode === "manual" ? (
            <div className="space-y-2">
              <Label htmlFor="rounding-manual">Total final a cobrar</Label>
              <Input
                id="rounding-manual"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={roundingManualTotal}
                onChange={(e) => {
                  setRoundingManualTotal(e.target.value);
                  const manual = Number(e.target.value);
                  if (Number.isFinite(manual) && manual > 0) {
                    const totals = computeCounterSaleTotals(
                      summary.subtotal,
                      counterDiscountPercent,
                      { mode: "manual", manualTotal: manual },
                    );
                    syncChargeTotalFromTotals(totals);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Debe ser menor a{" "}
                {formatPrice(counterSaleAmounts.totalAfterDiscount)} (importe con
                descuento).
              </p>
            </div>
          ) : null}
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-2">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatPrice(summary.subtotal)}</span>
            </div>
            {counterDiscountPercent > 0 ? (
              <>
                <div className="flex justify-between gap-3 text-emerald-700">
                  <span>
                    Descuento ({counterDiscountPercent}%)
                  </span>
                  <span className="font-medium">
                    −{formatPrice(counterSaleAmounts.discountAmount)}
                  </span>
                </div>
              </>
            ) : null}
            {counterSaleAmounts.roundingDiscount > 0 ? (
              <div className="flex justify-between gap-3 text-emerald-700">
                <span>Descuento redondeo</span>
                <span className="font-medium">
                  −{formatPrice(counterSaleAmounts.roundingDiscount)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
              <span className="font-semibold text-foreground">Total a cobrar</span>
              {counterPaymentAllowsCustomTotal(counterPayment) ? (
                <Input
                  id="counter-charge-total"
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
                  {formatPrice(counterSaleAmounts.finalTotal)}
                </span>
              )}
            </div>
            {counterPaymentAllowsCustomTotal(counterPayment) ? (
              <p className="text-xs text-muted-foreground">
                Referencia con descuento y redondeo:{" "}
                {formatPrice(counterSaleAmounts.finalTotal)}. Podés ajustar el
                monto cobrado por MercadoLibre.
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCounterModalOpen(false)}
              disabled={processingCounterSale}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
              onClick={handleCounterSale}
              disabled={processingCounterSale}
            >
              {processingCounterSale ? (
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
