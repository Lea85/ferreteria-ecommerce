import { Heart } from "lucide-react";

import { ProductCard } from "@/components/storefront/ProductCard";
import { MOCK_FEATURED } from "@/lib/mock-data";

export default function FavoritosPage() {
  const hasItems = false;

  if (!hasItems) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-20 text-center">
        <Heart className="size-14 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          No tenés favoritos aún
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Guardá productos tocando el corazón en el catálogo para verlos acá.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground">Favoritos</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_FEATURED.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
