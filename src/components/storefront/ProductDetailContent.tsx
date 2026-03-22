"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MockProductDetail } from "@/lib/mock-data";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";

import { ProductCard } from "./ProductCard";
import { ProductGallery } from "./ProductGallery";

type ProductDetailContentProps = {
  product: MockProductDetail;
};

export function ProductDetailContent({ product }: ProductDetailContentProps) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const variant = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  if (!variant) return null;

  const onSale = Boolean(
    variant.comparePrice && variant.comparePrice > variant.price,
  );
  const out = variant.stock <= 0;

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(product.rating));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {product.brand}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {product.name}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {stars.map((on, i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-4",
                    on ? "fill-store-orange text-store-orange" : "text-border",
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {product.rating} ({product.reviewCount} opiniones)
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatPrice(variant.price)}
            </span>
            {onSale ? (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(variant.comparePrice!)}
              </span>
            ) : null}
            {onSale ? (
              <Badge className="bg-store-orange text-store-orange-foreground">
                Oferta
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Precio para Gremios: consultar con ventas.
          </p>

          <Separator className="my-6" />

          {product.variants.length > 1 ? (
            <div className="space-y-2">
              <Label>Variante</Label>
              <Select
                value={variantId}
                onValueChange={(id) => {
                  setVariantId(id);
                  setQty(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí una opción" />
                </SelectTrigger>
                <SelectContent>
                  {product.variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {[v.color, v.size].filter(Boolean).join(" · ") || v.sku}{" "}
                      — {formatPrice(v.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-md border border-border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-none"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="min-w-10 text-center text-sm font-semibold tabular-nums">
                {qty}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-none"
                disabled={out || qty >= variant.stock}
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {out ? (
                <span className="font-medium text-destructive">Sin stock</span>
              ) : (
                <>
                  Quedan{" "}
                  <span className="font-semibold text-foreground">
                    {variant.stock}
                  </span>{" "}
                  unidades
                </>
              )}
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-6 w-full bg-store-orange text-lg text-store-orange-foreground hover:bg-store-orange/90 sm:w-auto sm:min-w-[280px]"
            disabled={out}
            onClick={() => {
              addItem({
                productId: product.id,
                variantId: variant.id,
                name: product.name,
                slug: product.slug,
                image: product.images[0] ?? product.image,
                price: variant.price,
                quantity: qty,
                sku: variant.sku,
                variantLabel: [variant.color, variant.size]
                  .filter(Boolean)
                  .join(" · "),
              });
              openCart();
            }}
          >
            <ShoppingCart className="size-5" />
            Agregar al carrito
          </Button>

          <Tabs defaultValue="desc" className="mt-10">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="desc">Descripción</TabsTrigger>
              <TabsTrigger value="specs">Especificaciones</TabsTrigger>
              <TabsTrigger value="reviews">Opiniones</TabsTrigger>
            </TabsList>
            <TabsContent value="desc" className="text-sm leading-relaxed">
              {product.description}
            </TabsContent>
            <TabsContent value="specs">
              <table className="w-full text-sm">
                <tbody>
                  {product.specs.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2 font-medium text-muted-foreground">
                        {row.label}
                      </td>
                      <td className="py-2 text-right">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>
            <TabsContent value="reviews" className="text-sm text-muted-foreground">
              Próximamente podrás ver opiniones verificadas de compradores.
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-xl font-bold text-foreground md:text-2xl">
          Productos complementarios
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Completá tu compra con estos productos relacionados.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {product.complementary.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
