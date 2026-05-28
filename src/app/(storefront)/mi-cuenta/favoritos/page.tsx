"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";

import { ProductCard, type ProductCardProduct } from "@/components/storefront/ProductCard";
import { Button } from "@/components/ui/button";
import { useFavoritesStore } from "@/stores/favorites.store";

export default function FavoritosPage() {
  const [products, setProducts] = useState<ProductCardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const hydrate = useFavoritesStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/user/favorites");
        const data = await res.json();
        if (!cancelled) {
          setProducts(Array.isArray(data.products) ? data.products : []);
        }
        await hydrate();
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hydrate, favoriteIds.join(",")]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-20 text-center">
        <Heart className="size-14 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          No tenés favoritos aún
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Guardá productos tocando el corazón en el catálogo para verlos acá.
        </p>
        <Button asChild className="mt-6">
          <Link href="/productos">Ir al catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Favoritos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {products.length} producto{products.length !== 1 ? "s" : ""} guardado
          {products.length !== 1 ? "s" : ""}
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </div>
  );
}
