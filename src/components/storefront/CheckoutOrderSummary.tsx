"use client";

import Image from "next/image";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";

export function CheckoutOrderSummary() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());

  return (
    <aside className="h-fit rounded-xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
      <h2 className="text-lg font-bold text-foreground">Tu pedido</h2>
      <Separator className="my-4" />
      <ul className="max-h-64 space-y-3 overflow-y-auto pr-1 text-sm">
        {items.length === 0 ? (
          <li className="text-muted-foreground">
            No hay productos.{" "}
            <Link href="/productos" className="text-primary underline">
              Ver catálogo
            </Link>
          </li>
        ) : (
          items.map((line) => (
            <li key={line.variantId} className="flex gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={line.image}
                  alt=""
                  fill
                  unoptimized={line.image.startsWith("http")}
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium leading-snug">
                  {line.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  x{line.quantity} · {formatPrice(line.price)}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
      <Separator className="my-4" />
      <div className="flex justify-between text-base font-bold">
        <span>Subtotal</span>
        <span className="text-primary">{formatPrice(subtotal)}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Envío e impuestos se confirman en los siguientes pasos.
      </p>
    </aside>
  );
}
