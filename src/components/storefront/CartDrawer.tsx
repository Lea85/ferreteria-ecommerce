"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";

export function CartDrawer() {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  const subtotal = getSubtotal();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!isOpen}
        onClick={closeCart}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShoppingBag className="size-5 text-primary" />
            Tu carrito
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={closeCart}>
            <X className="size-5" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="size-14 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">
              Tu carrito está vacío
            </p>
            <p className="text-sm text-muted-foreground">
              Agregá productos para comenzar tu compra.
            </p>
            <Button
              asChild
              className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
            >
              <Link href="/productos" onClick={closeCart}>
                Ver productos
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4 py-3">
              {items.map((line) => (
                <li
                  key={line.variantId}
                  className="flex gap-3 border-b border-border py-4 last:border-0"
                >
                  <Link
                    href={`/productos/${line.slug}`}
                    onClick={closeCart}
                    className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted"
                  >
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      unoptimized={line.image.startsWith("http")}
                      className="object-cover"
                      sizes="80px"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/productos/${line.slug}`}
                      onClick={closeCart}
                      className="line-clamp-2 font-medium leading-snug hover:text-primary"
                    >
                      {line.name}
                    </Link>
                    {line.variantLabel ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {line.variantLabel}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {formatPrice(line.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="inline-flex items-center rounded-md border border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-none"
                          onClick={() =>
                            updateQuantity(line.variantId, line.quantity - 1)
                          }
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="min-w-8 text-center text-sm tabular-nums">
                          {line.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-none"
                          onClick={() =>
                            updateQuantity(line.variantId, line.quantity + 1)
                          }
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(line.variantId)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold text-foreground">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <Separator className="my-3" />
              <div className="flex flex-col gap-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/carrito" onClick={closeCart}>
                    Ir al carrito
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
                >
                  <Link href="/checkout/datos" onClick={closeCart}>
                    Finalizar compra
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
