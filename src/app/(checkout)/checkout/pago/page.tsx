"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";
import { CheckoutOrderSummary } from "@/components/storefront/CheckoutOrderSummary";

export default function CheckoutPagoPage() {
  const [method, setMethod] = useState<"mp" | "transfer">("mp");
  const [accepted, setAccepted] = useState(false);
  const subtotal = useCartStore((s) => s.getSubtotal());

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">Pago</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí cómo querés abonar tu pedido.
        </p>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() => setMethod("mp")}
            className={cn(
              "flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",
              method === "mp"
                ? "border-store-orange bg-store-orange/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600">
              <CreditCard className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Mercado Pago</p>
              <p className="text-sm text-muted-foreground">
                Tarjeta de crédito, débito y dinero en cuenta.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMethod("transfer")}
            className={cn(
              "flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-colors",
              method === "transfer"
                ? "border-store-orange bg-store-orange/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Transferencia bancaria
              </p>
              <p className="text-sm text-muted-foreground">
                10% OFF extra en transferencia (demo).
              </p>
            </div>
          </button>
        </div>

        {method === "transfer" ? (
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <p className="font-semibold text-foreground">Datos bancarios</p>
            <Separator className="my-3" />
            <p>Banco Galicia — Cuenta corriente en pesos</p>
            <p className="mt-1 font-mono text-xs">CBU: 00701234-0000000000123456</p>
            <p className="font-mono text-xs">Alias: FERRESANIT.VENTAS</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Enviá el comprobante a ventas@ferresanit.com.ar con tu número de
              pedido.
            </p>
          </div>
        ) : null}

        <div className="mt-8 rounded-lg border border-border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total a pagar</span>
            <span className="text-lg font-bold text-primary">
              {formatPrice(subtotal)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(Boolean(v))}
          />
          <Label htmlFor="terms" className="cursor-pointer text-sm leading-snug">
            Acepto los términos y condiciones y la política de privacidad.
          </Label>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/checkout/envio">Volver</Link>
          </Button>
          <Button
            type="button"
            disabled={!accepted}
            className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90 disabled:opacity-50"
          >
            Confirmar pedido
          </Button>
        </div>
      </div>
      <CheckoutOrderSummary />
    </div>
  );
}
