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
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";

import { ProductCard } from "./ProductCard";
import { ProductGallery } from "./ProductGallery";

type VariantAttribute = {
  typeId: string;
  typeName: string;
  valueId: string;
  value: string;
};

type ProductVariant = {
  id: string; name?: string | null; sku: string; price: number;
  comparePrice?: number; stock: number;
  attributes?: VariantAttribute[];
};

type Complementary = {
  id: string; name: string; slug: string; brand: string | null;
  image: string; price: number; comparePrice?: number; stock: number;
};

type ProductDetail = {
  id: string; name: string; slug: string; description: string;
  brand: string | null; category: string | null; image: string;
  images: string[]; variants: ProductVariant[];
  specs: { label: string; value: string }[];
  rating: number; reviewCount: number;
  complementary: Complementary[];
};

type ProductDetailContentProps = {
  product: ProductDetail;
};

function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const hasAttributes = variants.some((v) => v.attributes && v.attributes.length > 0);

  if (!hasAttributes) {
    return (
      <div className="space-y-2">
        <Label>Variante</Label>
        <Select value={selectedId} onValueChange={onSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Elegí una opción" />
          </SelectTrigger>
          <SelectContent>
            {variants.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name || v.sku} — {formatPrice(v.price)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const attrTypes = new Map<string, { name: string; values: Map<string, string> }>();
  for (const v of variants) {
    for (const a of v.attributes || []) {
      if (!attrTypes.has(a.typeId)) {
        attrTypes.set(a.typeId, { name: a.typeName, values: new Map() });
      }
      attrTypes.get(a.typeId)!.values.set(a.valueId, a.value);
    }
  }

  const selectedVariant = variants.find((v) => v.id === selectedId);
  const selectedValueIds = new Set(
    selectedVariant?.attributes?.map((a) => a.valueId) || [],
  );

  function selectAttrValue(typeId: string, valueId: string) {
    const targetValueIds = new Map<string, string>();
    for (const [tId] of attrTypes) {
      if (tId === typeId) {
        targetValueIds.set(tId, valueId);
      } else {
        const current = selectedVariant?.attributes?.find((a) => a.typeId === tId);
        if (current) targetValueIds.set(tId, current.valueId);
      }
    }

    const match = variants.find((v) => {
      if (!v.attributes) return false;
      return Array.from(targetValueIds.entries()).every(([, vId]) =>
        v.attributes!.some((a) => a.valueId === vId),
      );
    });

    if (match) {
      onSelect(match.id);
    }
  }

  return (
    <div className="space-y-4">
      {Array.from(attrTypes.entries()).map(([typeId, type]) => (
        <div key={typeId} className="space-y-2">
          <Label className="text-sm font-medium">{type.name}</Label>
          <div className="flex flex-wrap gap-2">
            {Array.from(type.values.entries()).map(([valId, valLabel]) => (
              <button
                key={valId}
                type="button"
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  selectedValueIds.has(valId)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/50",
                )}
                onClick={() => selectAttrValue(typeId, valId)}
              >
                {valLabel}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        SKU: {selectedVariant?.sku} — {formatPrice(selectedVariant?.price ?? 0)}
      </p>
    </div>
  );
}

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
            <VariantSelector
              variants={product.variants}
              selectedId={variantId}
              onSelect={(id) => { setVariantId(id); setQty(1); }}
            />
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
                variantLabel: variant.attributes
                  ? variant.attributes.map((a) => a.value).join(" · ")
                  : variant.name || "",
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
