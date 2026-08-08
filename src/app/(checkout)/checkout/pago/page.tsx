"use client";



import Link from "next/link";

import { useRouter, useSearchParams } from "next/navigation";

import { useEffect, useState } from "react";

import { Building2, CreditCard, Download, FileText, Loader2, Mail, Printer } from "lucide-react";

import { toast } from "sonner";



import { MercadoPagoPaymentModal } from "@/components/storefront/MercadoPagoPaymentModal";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Checkbox } from "@/components/ui/checkbox";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";

import { Separator } from "@/components/ui/separator";

import { cn, formatPrice } from "@/lib/utils";

import {
  computeBestCategoryDiscount,
  type CategoryBenefit,
} from "@/lib/customer-category-discount";

import { cartHasOverStock, toastCheckoutBlockedOverStock } from "@/lib/cart-stock";

import {

  checkoutAddressToOrderShipping,

  parseCheckoutShippingState,

  resolveCheckoutShippingAddress,

} from "@/lib/checkout-shipping";

import { useCartStore } from "@/stores/cart.store";

import { CheckoutOrderSummary } from "@/components/storefront/CheckoutOrderSummary";



type BankData = {

  bank_name?: string; bank_account_type?: string; bank_cbu?: string;

  bank_alias?: string; bank_holder?: string; bank_email?: string;

};



type MpSession = {

  orderId: string;

  preferenceId: string;

  publicKey: string;

};



function downloadAsText(title: string, content: string) {

  const blob = new Blob([`${title}\n${"=".repeat(title.length)}\n\n${content}`], { type: "text/plain;charset=utf-8" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.txt`;

  a.click();

  URL.revokeObjectURL(url);

}



function buildCheckoutPayload(subtotal: number, items: ReturnType<typeof useCartStore.getState>["items"]) {

  const datos = JSON.parse(localStorage.getItem("checkout_datos") || "{}");

  const envio = parseCheckoutShippingState(localStorage.getItem("checkout_envio"));

  const deliveryAddress = resolveCheckoutShippingAddress(envio);



  return {

    shippingMethod: envio.method === "delivery" ? "OWN_DELIVERY" : "STORE_PICKUP",

    contactData: { nombre: datos.nombre, apellido: datos.apellido, email: datos.email, telefono: datos.telefono },

    billingData: datos.sameAsBilling

      ? { nombre: datos.nombre, apellido: datos.apellido, doc: datos.doc, condicionFiscal: datos.condicionFiscal }

      : { nombre: datos.factNombre, apellido: datos.factApellido, doc: datos.factDoc, condicionFiscal: datos.factCondicion },

    shippingAddress: deliveryAddress

      ? {

          ...checkoutAddressToOrderShipping(deliveryAddress),

          addressId:

            envio.selectedAddressId && envio.selectedAddressId !== "new"

              ? envio.selectedAddressId

              : undefined,

          saveToProfile: deliveryAddress.saveToProfile,

          setAsDefault: deliveryAddress.setAsDefault,

        }

      : null,

    items: items.map((i) => ({

      productId: i.productId,

      variantId: i.variantId,

      quantity: i.quantity,

      price: i.price,

      name: i.name,

    })),

    subtotal,

  };

}



export default function CheckoutPagoPage() {

  const searchParams = useSearchParams();

  const [method, setMethod] = useState<"mp" | "transfer">("transfer");

  const [accepted, setAccepted] = useState(false);

  const [bank, setBank] = useState<BankData>({});

  const [submitting, setSubmitting] = useState(false);

  const [tycOpen, setTycOpen] = useState(false);

  const [tycDoc, setTycDoc] = useState<{ title: string; content: string } | null>(null);

  const [tycLoading, setTycLoading] = useState(false);

  const [mpEnabled, setMpEnabled] = useState(false);

  const [mpModalOpen, setMpModalOpen] = useState(false);

  const [mpSession, setMpSession] = useState<MpSession | null>(null);

  const subtotal = useCartStore((s) => s.getSubtotal());

  const items = useCartStore((s) => s.items);

  const clearCart = useCartStore((s) => s.clearCart);

  const [categoryBenefits, setCategoryBenefits] = useState<CategoryBenefit[]>([]);

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  const categoryDiscount = computeBestCategoryDiscount(
    categoryBenefits,
    subtotal,
    totalQuantity,
  );

  const discountAmount = categoryDiscount?.amount ?? 0;

  const totalToPay = Math.max(0, subtotal - discountAmount);

  const router = useRouter();



  useEffect(() => {

    fetch("/api/settings/public?keys=bank_name,bank_account_type,bank_cbu,bank_alias,bank_holder,bank_email")

      .then((r) => r.json())

      .then((d) => { if (d.settings) setBank(d.settings); })

      .catch(() => {});



    fetch("/api/checkout/mercadopago/config")

      .then((r) => r.json())

      .then((d) => setMpEnabled(Boolean(d.enabled && d.publicKey)))

      .catch(() => {});



    fetch("/api/user/discount")

      .then((r) => (r.ok ? r.json() : null))

      .then((d) => {

        if (Array.isArray(d?.benefits)) setCategoryBenefits(d.benefits);

      })

      .catch(() => {});

  }, []);



  useEffect(() => {

    if (searchParams.get("mp") === "failure") {

      toast.error("El pago con Mercado Pago no se completo. Podes intentar nuevamente.");

    }

  }, [searchParams]);



  async function openTyC() {

    setTycOpen(true);

    if (tycDoc) return;

    setTycLoading(true);

    try {

      const res = await fetch("/api/legals/public?slug=terminos-compra");

      const data = await res.json();

      if (data.document) setTycDoc({ title: data.document.title, content: data.document.content });

      else setTycDoc({ title: "Terminos y Condiciones", content: "El documento no esta disponible en este momento." });

    } catch {

      setTycDoc({ title: "Terminos y Condiciones", content: "Error al cargar el documento." });

    } finally {

      setTycLoading(false);

    }

  }



  function finishCheckout(orderId: string) {

    clearCart();

    localStorage.removeItem("checkout_datos");

    localStorage.removeItem("checkout_envio");

    setMpModalOpen(false);

    setMpSession(null);

    router.push(`/checkout/exito?orderId=${orderId}`);

  }



  async function startMercadoPagoPayment() {

    if (cartHasOverStock(items)) {

      toastCheckoutBlockedOverStock();

      return;

    }



    setSubmitting(true);

    try {

      const payload = buildCheckoutPayload(subtotal, items);

      const res = await fetch("/api/checkout/mercadopago/create", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(payload),

      });

      const data = await res.json();



      if (!res.ok || !data.preferenceId) {

        toast.error(data.error || "No se pudo iniciar el pago con Mercado Pago.");

        return;

      }



      setMpSession({

        orderId: data.orderId,

        preferenceId: data.preferenceId,

        publicKey: data.publicKey,

      });

      setMpModalOpen(true);

    } catch {

      toast.error("Error de conexion.");

    } finally {

      setSubmitting(false);

    }

  }



  async function handleConfirm() {

    if (!accepted) return;



    if (method === "mp") {

      await startMercadoPagoPayment();

      return;

    }



    if (cartHasOverStock(items)) {

      toastCheckoutBlockedOverStock();

      return;

    }



    setSubmitting(true);

    try {

      const payload = buildCheckoutPayload(subtotal, items);

      const body = { ...payload, paymentMethod: "BANK_TRANSFER" };



      const res = await fetch("/api/checkout/confirm", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(body),

      });

      const data = await res.json();



      if (res.ok && data.orderId) {

        finishCheckout(data.orderId);

      } else {

        toast.error(data.error || "Error al confirmar el pedido.");

      }

    } catch {

      toast.error("Error de conexion.");

    } finally {

      setSubmitting(false);

    }

  }



  return (

    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">

        <h1 className="text-xl font-bold text-foreground">Pago</h1>

        <p className="mt-1 text-sm text-muted-foreground">Elegi como queres abonar tu pedido.</p>



        <div className="mt-8 space-y-4">

          <button type="button" onClick={() => setMethod("transfer")}

            className={cn("flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",

              method === "transfer" ? "border-store-orange bg-store-orange/5" : "border-border hover:border-primary/30")}>

            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="size-6" /></div>

            <div>

              <p className="font-semibold text-foreground">Transferencia bancaria</p>

              <p className="text-sm text-muted-foreground">Transferi y envia el comprobante.</p>

            </div>

          </button>



          <button

            type="button"

            disabled={!mpEnabled}

            onClick={() => mpEnabled && setMethod("mp")}

            className={cn(

              "relative flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",

              !mpEnabled && "cursor-not-allowed opacity-60",

              method === "mp" ? "border-store-orange bg-store-orange/5" : "border-border hover:border-primary/30",

            )}

          >

            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600"><CreditCard className="size-6" /></div>

            <div>

              <p className="font-semibold text-foreground">Mercado Pago</p>

              <p className="text-sm text-muted-foreground">Tarjeta de credito, debito y dinero en cuenta.</p>

            </div>

            {!mpEnabled && (

              <Badge className="absolute right-3 top-3 bg-amber-100 text-amber-800 hover:bg-amber-100">

                Sin configurar

              </Badge>

            )}

          </button>

        </div>



        {method === "transfer" && (

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">

            <p className="font-semibold text-foreground">Datos bancarios</p>

            <Separator className="my-3" />

            <p>{bank.bank_name || "Banco Galicia"} — {bank.bank_account_type || "Cuenta corriente en pesos"}</p>

            <p className="mt-1 font-mono text-xs">CBU: {bank.bank_cbu || "00701234-0000000000123456"}</p>

            <p className="font-mono text-xs">Alias: {bank.bank_alias || "FERROSAN.VENTAS"}</p>

            {bank.bank_holder && <p className="mt-1 text-xs">Titular: {bank.bank_holder}</p>}

            <div className="mt-4 flex gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
              <Mail className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                  Importante: envia el comprobante de transferencia
                </p>
                <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-50">
                  Una vez realizada la transferencia, envia el comprobante a{" "}
                  <span className="font-bold underline underline-offset-2">
                    {bank.bank_email || "ventas@ferrosan.com.ar"}
                  </span>{" "}
                  indicando el numero de pedido que recibiras al confirmar.
                </p>
              </div>
            </div>

          </div>

        )}



        {method === "mp" && mpEnabled && (

          <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50/50 p-4 text-sm dark:border-sky-900 dark:bg-sky-950/30">

            <p className="font-semibold text-foreground">Pago con Mercado Pago</p>

            <p className="mt-1 text-muted-foreground">

              Al confirmar se abrira una ventana para completar el pago de forma segura.

            </p>

          </div>

        )}



        <div className="mt-8 rounded-lg border border-border p-4">

          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm text-emerald-600">
                <span>{categoryDiscount?.label ?? "Descuento"}</span>
                <span className="font-medium">-{formatPrice(discountAmount)}</span>
              </div>
              <Separator className="my-3" />
            </>
          )}

          <div className="flex justify-between text-sm">

            <span className="text-muted-foreground">Total a pagar</span>

            <span className="text-lg font-bold text-primary">{formatPrice(totalToPay)}</span>

          </div>

        </div>



        <div className="mt-6 flex items-start gap-3">

          <Checkbox id="terms" checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} />

          <Label htmlFor="terms" className="cursor-pointer text-sm leading-snug">

            Acepto los{" "}

            <button type="button" onClick={openTyC} className="inline font-semibold text-primary underline underline-offset-2 hover:text-primary/80">

              terminos y condiciones

            </button>

            {" "}y la politica de privacidad. <span className="text-destructive">*</span>

          </Label>

        </div>



        <div className="mt-8 flex flex-col gap-3 sm:flex-row">

          <Button variant="outline" asChild><Link href="/checkout/envio">Volver</Link></Button>

          <Button type="button" disabled={!accepted || submitting} onClick={handleConfirm}

            className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90 disabled:opacity-50 gap-2">

            {submitting && <Loader2 className="size-4 animate-spin" />}

            {method === "mp" ? "Pagar con Mercado Pago" : "Confirmar pedido"}

          </Button>

        </div>

      </div>

      <CheckoutOrderSummary />



      {mpSession && (

        <MercadoPagoPaymentModal

          open={mpModalOpen}

          onOpenChange={setMpModalOpen}

          publicKey={mpSession.publicKey}

          preferenceId={mpSession.preferenceId}

          amount={totalToPay}

          orderId={mpSession.orderId}

          onSuccess={finishCheckout}

        />

      )}



      <Dialog open={tycOpen} onOpenChange={setTycOpen}>

        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden flex flex-col">

          <DialogHeader>

            <DialogTitle className="flex items-center gap-2">

              <FileText className="size-5 text-primary" />

              {tycDoc?.title || "Terminos y Condiciones"}

            </DialogTitle>

          </DialogHeader>



          {tycLoading ? (

            <div className="flex items-center justify-center py-12">

              <Loader2 className="size-6 animate-spin text-muted-foreground" />

            </div>

          ) : tycDoc ? (

            <>

              <div className="flex-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-4">

                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap text-sm leading-relaxed">

                  {tycDoc.content}

                </div>

              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">

                <div className="flex gap-2">

                  <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadAsText(tycDoc.title, tycDoc.content)}>

                    <Download className="size-4" />

                    Descargar

                  </Button>

                  <Button variant="outline" size="sm" className="gap-2" onClick={() => {

                    const w = window.open("", "_blank"); if (!w) return;

                    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${tycDoc.title}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#222;line-height:1.6}h1{border-bottom:2px solid #333;padding-bottom:8px}pre{white-space:pre-wrap;font-family:inherit}@media print{body{margin:20px}}</style></head><body><h1>${tycDoc.title}</h1><pre>${tycDoc.content}</pre><script>window.print();<\/script></body></html>`);

                    w.document.close();

                  }}>

                    <Printer className="size-4" />

                    Imprimir

                  </Button>

                </div>

                <Button size="sm" onClick={() => { setTycOpen(false); if (!accepted) setAccepted(true); }}>

                  Aceptar y cerrar

                </Button>

              </div>

            </>

          ) : null}

        </DialogContent>

      </Dialog>

    </div>

  );

}

