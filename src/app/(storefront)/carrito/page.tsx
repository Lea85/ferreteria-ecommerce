"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";
import { toast } from "sonner";

export default function CarritoPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);
  const [canGenerateQuotes, setCanGenerateQuotes] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);

  useEffect(() => {
    fetch("/api/quotes?checkPermission=true")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.canGenerateQuotes) setCanGenerateQuotes(true);
      })
      .catch(() => {});
  }, []);

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

      const settingsRes = await fetch(
        "/api/settings/public?keys=store_name,store_address,store_phone,store_logo_url,contact_email,quote_validity_days",
      );
      const settingsData = await settingsRes.json();
      const settings = settingsData.settings || {};

      generateQuotePDF(data.quote, settings);
    } catch {
      toast.error("Error al generar presupuesto");
    } finally {
      setGeneratingQuote(false);
    }
  }

  function generateQuotePDF(
    quote: any,
    storeSettings: Record<string, string>,
  ) {
    const storeName = storeSettings.store_name || "Ferretería";
    const storeAddress = storeSettings.store_address || "";
    const storePhone = storeSettings.store_phone || "";
    const storeEmail = storeSettings.contact_email || "";
    const validityDays = storeSettings.quote_validity_days || "7";

    const validUntil = new Date(quote.validUntil).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const createdAt = new Date(quote.createdAt).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const itemRows = quote.items
      .map(
        (item: any) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px">${item.sku}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace">$${Number(item.unitPrice).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-family:monospace">$${Number(item.subtotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
          </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Presupuesto ${quote.quoteNumber}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; margin: 0; padding: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #f97316; }
    .logo-section h1 { margin: 0; font-size: 28px; color: #f97316; }
    .logo-section p { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
    .quote-info { text-align: right; }
    .quote-info h2 { margin: 0; font-size: 20px; color: #374151; }
    .quote-info p { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f97316; color: white; padding: 10px 12px; text-align: left; font-size: 13px; font-weight: 600; }
    th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: center; }
    th:nth-child(4), th:nth-child(5) { text-align: right; }
    .totals { margin-top: 20px; text-align: right; }
    .totals table { width: 300px; margin-left: auto; }
    .totals td { padding: 6px 12px; font-size: 14px; }
    .totals .total-row td { font-size: 18px; font-weight: 700; border-top: 2px solid #f97316; padding-top: 12px; }
    .validity { margin-top: 30px; padding: 16px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; text-align: center; }
    .validity p { margin: 0; font-size: 14px; color: #9a3412; font-weight: 600; }
    .validity span { font-size: 12px; color: #c2410c; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
    .footer p { margin: 2px 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <h1>${storeName}</h1>
      ${storeAddress ? `<p>${storeAddress}</p>` : ""}
      ${storePhone ? `<p>Tel: ${storePhone}</p>` : ""}
      ${storeEmail ? `<p>${storeEmail}</p>` : ""}
    </div>
    <div class="quote-info">
      <h2>PRESUPUESTO</h2>
      <p><strong>N°:</strong> ${quote.quoteNumber}</p>
      <p><strong>Fecha:</strong> ${createdAt}</p>
      <p><strong>Válido hasta:</strong> ${validUntil}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Descripción</th>
        <th>Cant.</th>
        <th>P. Unit.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td style="color:#6b7280">Subtotal</td>
        <td style="text-align:right;font-family:monospace">$${Number(quote.subtotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL</td>
        <td style="text-align:right;font-family:monospace;color:#f97316">$${Number(quote.total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
      </tr>
    </table>
  </div>

  <div class="validity">
    <p>Presupuesto válido por ${validityDays} días hábiles</p>
    <span>Vencimiento: ${validUntil}</span>
  </div>

  <div class="footer">
    <p><strong>${storeName}</strong></p>
    ${storeAddress ? `<p>${storeAddress}</p>` : ""}
    ${storePhone ? `<p>Tel: ${storePhone}</p>` : ""}
    ${storeEmail ? `<p>${storeEmail}</p>` : ""}
    <p style="margin-top:8px">Este presupuesto no constituye factura. Los precios pueden variar sin previo aviso una vez vencido el plazo de validez.</p>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  const subtotal = getSubtotal();
  const discount = applied ? Math.round(subtotal * 0.05) : 0;
  const shippingNote = "A calcular";
  const total = subtotal - discount;

  const empty = items.length === 0;

  const summary = useMemo(
    () => ({ subtotal, discount, total }),
    [subtotal, discount, total],
  );

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
                  <div className="inline-flex items-center rounded-md border border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-none"
                      onClick={() =>
                        updateQuantity(line.variantId, line.quantity - 1)
                      }
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="min-w-10 text-center text-sm font-semibold tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-none"
                      onClick={() =>
                        updateQuantity(line.variantId, line.quantity + 1)
                      }
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
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
              <span className="text-muted-foreground">Descuento</span>
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
          <Button
            asChild
            className="mt-6 w-full bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
          >
            <Link href="/checkout/datos">Finalizar compra</Link>
          </Button>
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
    </div>
  );
}
