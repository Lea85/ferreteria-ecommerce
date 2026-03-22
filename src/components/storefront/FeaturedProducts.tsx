import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { MockProductCard } from "@/lib/mock-data";

import { ProductCard } from "./ProductCard";

type FeaturedProductsProps = {
  products: MockProductCard[];
};

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="border-b border-border bg-background py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Productos Destacados
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lo más elegido por instaladores y mayoristas.
            </p>
          </div>
          <Link
            href="/productos"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Ver todos
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4 md:gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="w-[min(280px,78vw)] shrink-0 md:w-auto md:shrink"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
