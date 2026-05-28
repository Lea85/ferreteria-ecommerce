"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

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
import { useFavoritesStore } from "@/stores/favorites.store";

export type ProductCardProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category?: string | null;
  image: string | null;
  price: number;
  maxPrice?: number | null;
  comparePrice?: number | null;
  stock: number;
  variantCount?: number;
  defaultVariantId?: string;
  defaultSku?: string;
};

type ProductCardProps = {
  product: ProductCardProduct;
  className?: string;
};

export function ProductCard({ product, className }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(product.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const favLoading = useFavoritesStore((s) => s.loading);

  async function onToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggleFavorite(product.id);
    if (result === "auth_required") {
      toast.error("Iniciá sesión para guardar favoritos");
      router.push("/login");
      return;
    }
    if (result === "error") {
      toast.error("No se pudo actualizar el favorito");
    }
  }

  const onSale = Boolean(
    product.comparePrice && product.comparePrice > product.price,
  );
  const outOfStock = product.stock <= 0;
  const canAddToCart = Boolean(product.defaultVariantId) && !outOfStock;

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
            unoptimized={!!(product.image && product.image.startsWith("http"))}
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
            isFavorite && "text-red-500",
          )}
          onClick={onToggleFavorite}
          disabled={favLoading}
          aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          aria-pressed={isFavorite}
        >
          <Heart className={cn("size-4", isFavorite && "fill-current")} />
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
          {product.maxPrice ? (
            <span className="text-lg font-bold text-primary">
              Desde {formatPrice(product.price)} a {formatPrice(product.maxPrice)}
            </span>
          ) : (
            <span className="text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </span>
          )}
          {onSale && !product.maxPrice ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.comparePrice!)}
            </span>
          ) : null}
          {(product.variantCount ?? 0) > 1 && (
            <Badge variant="outline" className="text-[10px]">
              {product.variantCount} variantes
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          type="button"
          className="w-full bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
          disabled={!canAddToCart}
          onClick={() => {
            if (!product.defaultVariantId) return;
            addItem({
              productId: product.id,
              variantId: product.defaultVariantId,
              name: product.name,
              slug: product.slug,
              image: product.image || "/placeholder-product.webp",
              price: product.price,
              stock: product.stock,
              quantity: 1,
              sku: product.defaultSku,
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
