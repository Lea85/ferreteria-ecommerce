"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";
import { CheckoutOrderSummary } from "@/components/storefront/CheckoutOrderSummary";

type BankData = {
  bank_name?: string; bank_account_type?: string; bank_cbu?: string;
  bank_alias?: string; bank_holder?: string; bank_email?: string;
};

export default function CheckoutPagoPage() {
  const [method, setMethod] = useState<"mp" | "transfer">("transfer");
  const [accepted, setAccepted] = useState(false);
  const [bank, setBank] = useState<BankData>({});
  const [submitting, setSubmitting] = useState(false);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/settings/public?keys=bank_name,bank_account_type,bank_cbu,bank_alias,bank_holder,bank_email")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setBank(d.settings); })
      .catch(() => {});
  }, []);

  async function handleConfirm() {
    if (!accepted) return;
    if (method === "mp") { toast.info("Mercado Pago estara disponible proximamente."); return; }

    setSubmitting(true);
    try {
      const datos = JSON.parse(localStorage.getItem("checkout_datos") || "{}");
      const envio = JSON.parse(localStorage.getItem("checkout_envio") || "{}");

      const body = {
        paymentMethod: "BANK_TRANSFER",
        shippingMethod: envio.method === "delivery" ? "OWN_DELIVERY" : "STORE_PICKUP",
        contactData: { nombre: datos.nombre, apellido: datos.apellido, email: datos.email, telefono: datos.telefono },
        billingData: datos.sameAsBilling
          ? { nombre: datos.nombre, apellido: datos.apellido, doc: datos.doc, condicionFiscal: datos.condicionFiscal }
          : { nombre: datos.factNombre, apellido: datos.factApellido, doc: datos.factDoc, condicionFiscal: datos.factCondicion },
        shippingAddress: envio.method === "delivery"
          ? { calle: datos.calle, piso: datos.piso, cp: datos.cp, localidad: datos.localidad, provincia: datos.provincia }
          : null,
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity, price: i.price, name: i.name })),
        subtotal,
      };

      const res = await fetch("/api/checkout/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (res.ok && data.orderId) {
        clearCart();
        localStorage.removeItem("checkout_datos");
        localStorage.removeItem("checkout_envio");
        router.push(`/checkout/exito?orderId=${data.orderId}`);
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

          <button type="button" onClick={() => setMethod("mp")}
            className={cn("relative flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors opacity-60",
              method === "mp" ? "border-store-orange bg-store-orange/5" : "border-border hover:border-primary/30")}>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600"><CreditCard className="size-6" /></div>
            <div>
              <p className="font-semibold text-foreground">Mercado Pago</p>
              <p className="text-sm text-muted-foreground">Tarjeta de credito, debito y dinero en cuenta.</p>
            </div>
            <Badge className="absolute right-3 top-3 bg-amber-100 text-amber-800 hover:bg-amber-100">Proximamente</Badge>
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
            <p className="mt-2 text-xs text-muted-foreground">
              Envia el comprobante a {bank.bank_email || "ventas@ferrosan.com.ar"} con tu numero de pedido.
            </p>
          </div>
        )}

        <div className="mt-8 rounded-lg border border-border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total a pagar</span>
            <span className="text-lg font-bold text-primary">{formatPrice(subtotal)}</span>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3">
          <Checkbox id="terms" checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} />
          <Label htmlFor="terms" className="cursor-pointer text-sm leading-snug">
            Acepto los terminos y condiciones y la politica de privacidad. <span className="text-destructive">*</span>
          </Label>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" asChild><Link href="/checkout/envio">Volver</Link></Button>
          <Button type="button" disabled={!accepted || submitting} onClick={handleConfirm}
            className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90 disabled:opacity-50 gap-2">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Confirmar pedido
          </Button>
        </div>
      </div>
      <CheckoutOrderSummary />
    </div>
  );
}
