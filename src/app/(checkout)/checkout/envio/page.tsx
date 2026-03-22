"use client";

import Link from "next/link";
import { useState } from "react";
import { Store, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckoutOrderSummary } from "@/components/storefront/CheckoutOrderSummary";

export default function CheckoutEnvioPage() {
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">Método de envío</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí cómo querés recibir tu pedido.
        </p>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() => setMethod("pickup")}
            className={cn(
              "flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",
              method === "pickup"
                ? "border-store-orange bg-store-orange/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Retiro en sucursal
              </p>
              <p className="text-sm text-muted-foreground">Gratis</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Listo para retirar en 24–48 h hábiles según stock.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMethod("delivery")}
            className={cn(
              "flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",
              method === "delivery"
                ? "border-store-orange bg-store-orange/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Envío a domicilio
              </p>
              <p className="text-sm text-muted-foreground">Costo a confirmar</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Entrega estimada 3–6 días hábiles (CABA y GBA). El costo se
                calcula al confirmar el pedido.
              </p>
            </div>
          </button>
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Label className="text-foreground">Tiempo estimado</Label>
          <p className="mt-1">
            {method === "pickup"
              ? "24–48 h hábiles para retiro en Av. San Martín 1450."
              : "3–6 días hábiles según zona y volumen del pedido."}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/checkout/datos">Volver</Link>
          </Button>
          <Button
            asChild
            className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
          >
            <Link href="/checkout/pago">Continuar</Link>
          </Button>
        </div>
      </div>
      <CheckoutOrderSummary />
    </div>
  );
}
