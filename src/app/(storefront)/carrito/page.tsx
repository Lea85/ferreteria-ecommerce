"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";

export default function CarritoPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);

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
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href="/productos">Continuar comprando</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
