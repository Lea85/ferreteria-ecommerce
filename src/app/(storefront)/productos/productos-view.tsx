"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryTree } from "@/components/storefront/CategoryTree";
import { FacetedFilters, storefrontFilterParsers } from "@/components/storefront/FacetedFilters";
import { ProductCard } from "@/components/storefront/ProductCard";
import { MOCK_CATEGORY_TREE, MOCK_PRODUCTS } from "@/lib/mock-data";

const PAGE_SIZE = 6;

export function ProductosView() {
  const [filters] = useQueryStates(storefrontFilterParsers);
  const [q] = useQueryState("q", parseAsString.withDefault(""));
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsString.withDefault("relevance"),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const filtered = useMemo(() => {
    let list = [...MOCK_PRODUCTS];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term),
      );
    }
    if (filters.category) {
      list = list.filter((p) => p.category === filters.category);
    }
    if (filters.stock) {
      list = list.filter((p) => p.stock > 0);
    }
    if (filters.min != null) {
      list = list.filter((p) => p.price >= filters.min!);
    }
    if (filters.max != null) {
      list = list.filter((p) => p.price <= filters.max!);
    }
    if (filters.marcas) {
      const set = new Set(
        filters.marcas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      if (set.size > 0) {
        list = list.filter((p) => set.has(p.brand));
      }
    }
    if (sort === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sort === "newest") {
      list.sort((a, b) => Number(b.id) - Number(a.id));
    } else if (sort === "discount") {
      list = list.filter(
        (p) => p.comparePrice != null && p.comparePrice > p.price,
      );
    }
    return list;
  }, [filters, q, sort]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Inicio
        </Link>
        <span>/</span>
        <span className="text-foreground">Productos</span>
      </nav>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Catálogo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total === 0 || total > 1
              ? `${total} productos encontrados`
              : "1 producto encontrado"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="lg:hidden"
                type="button"
              >
                <SlidersHorizontal className="size-4" />
                Filtros
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Filtros</DialogTitle>
              </DialogHeader>
              <FacetedFilters />
            </DialogContent>
          </Dialog>
          <Select
            value={sort}
            onValueChange={(v) => {
              void setSort(v);
              void setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Más relevantes</SelectItem>
              <SelectItem value="price_asc">Menor precio</SelectItem>
              <SelectItem value="price_desc">Mayor precio</SelectItem>
              <SelectItem value="newest">Más nuevos</SelectItem>
              <SelectItem value="discount">Solo ofertas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <CategoryTree
            categories={MOCK_CATEGORY_TREE}
            activeCategorySlug={filters.category || undefined}
          />
          <div className="mt-6">
            <FacetedFilters />
          </div>
        </aside>

        <div>
          {slice.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
              No encontramos productos con los filtros seleccionados.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 md:gap-6">
              {slice.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safePage <= 1}
                onClick={() => void setPage(Math.max(1, safePage - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {safePage} de {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safePage >= totalPages}
                onClick={() =>
                  void setPage(Math.min(totalPages, safePage + 1))
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
