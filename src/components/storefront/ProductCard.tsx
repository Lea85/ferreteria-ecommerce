"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";

export type ProductCardProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category?: string | null;
  image: string | null;
  price: number;
  comparePrice?: number | null;
  stock: number;
};

type ProductCardProps = {
  product: ProductCardProduct;
  className?: string;
};

export function ProductCard({ product, className }: ProductCardProps) {
  const [fav, setFav] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const onSale = Boolean(
    product.comparePrice && product.comparePrice > product.price,
  );
  const outOfStock = product.stock <= 0;

  return (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden border-border/80 transition-shadow hover:shadow-lg",
        className,
      )}
    >
      <CardHeader className="relative space-y-0 p-0">
        <Link
          href={`/productos/${product.slug}`}
          className="relative block aspect-square overflow-hidden bg-muted"
        >
          <Image
            src={product.image || "/placeholder-product.webp"}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 45vw, (max-width:1024px) 33vw, 25vw"
          />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {outOfStock ? (
              <Badge variant="secondary" className="bg-background/90">
                Sin stock
              </Badge>
            ) : null}
            {onSale ? (
              <Badge className="border-0 bg-store-orange text-store-orange-foreground">
                Oferta
              </Badge>
            ) : null}
          </div>
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cn(
            "absolute right-2 top-2 size-9 rounded-full border border-border bg-background/90 shadow-sm backdrop-blur",
            fav && "text-red-500",
          )}
          onClick={() => setFav((v) => !v)}
          aria-label="Favoritos"
        >
          <Heart className={cn("size-4", fav && "fill-current")} />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1 p-4">
        {product.brand && (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        )}
        <Link href={`/productos/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          {onSale ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.comparePrice!)}
            </span>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          type="button"
          className="w-full bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
          disabled={outOfStock}
          onClick={() => {
            addItem({
              productId: product.id,
              variantId: `${product.id}-default`,
              name: product.name,
              slug: product.slug,
              image: product.image || "/placeholder-product.webp",
              price: product.price,
              quantity: 1,
              sku: `FS-${product.id}`,
            });
            openCart();
          }}
        >
          <ShoppingCart className="size-4" />
          Agregar al carrito
        </Button>
      </CardFooter>
    </Card>
  );
}
