"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Store, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckoutOrderSummary } from "@/components/storefront/CheckoutOrderSummary";

const SHIPPING_KEY = "checkout_envio";

export default function CheckoutEnvioPage() {
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [storeAddress, setStoreAddress] = useState("Av. Caseros 2421, CABA");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(SHIPPING_KEY);
    if (stored) {
      try { const p = JSON.parse(stored); if (p.method) setMethod(p.method); } catch {}
    }

    fetch("/api/settings/public?keys=google_maps_address")
      .then((r) => r.json())
      .then((d) => { if (d.settings?.google_maps_address) setStoreAddress(d.settings.google_maps_address); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function select(m: "pickup" | "delivery") {
    setMethod(m);
    localStorage.setItem(SHIPPING_KEY, JSON.stringify({ method: m }));
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">Metodo de envio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elegi como queres recibir tu pedido.</p>

        <div className="mt-8 space-y-4">
          <button type="button" onClick={() => select("pickup")}
            className={cn("flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",
              method === "pickup" ? "border-store-orange bg-store-orange/5" : "border-border hover:border-primary/30")}>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Store className="size-6" /></div>
            <div>
              <p className="font-semibold text-foreground">Retiro en sucursal</p>
              <p className="text-sm text-muted-foreground">Gratis</p>
              <p className="mt-2 text-xs text-muted-foreground">{storeAddress}</p>
              <p className="mt-1 text-xs text-muted-foreground">Listo para retirar en 24-48 h habiles segun stock.</p>
            </div>
          </button>

          <button type="button" onClick={() => select("delivery")}
            className={cn("flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",
              method === "delivery" ? "border-store-orange bg-store-orange/5" : "border-border hover:border-primary/30")}>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Truck className="size-6" /></div>
            <div>
              <p className="font-semibold text-foreground">Envio a domicilio</p>
              <p className="text-sm text-muted-foreground">Costo a confirmar</p>
              <p className="mt-2 text-xs text-muted-foreground">Entrega estimada 3-6 dias habiles (CABA y GBA).</p>
            </div>
          </button>
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Label className="text-foreground">Tiempo estimado</Label>
          <p className="mt-1">
            {method === "pickup"
              ? `24-48 h habiles para retiro en ${storeAddress}.`
              : "3-6 dias habiles segun zona y volumen del pedido."}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" asChild><Link href="/checkout/datos">Volver</Link></Button>
          <Button asChild className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"><Link href="/checkout/pago">Continuar</Link></Button>
        </div>
      </div>
      <CheckoutOrderSummary />
    </div>
  );
}
