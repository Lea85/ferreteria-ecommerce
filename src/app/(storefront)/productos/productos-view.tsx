"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { ChevronLeft, ChevronRight, Loader2, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CategoryTree } from "@/components/storefront/CategoryTree";
import { FacetedFilters, storefrontFilterParsers } from "@/components/storefront/FacetedFilters";
import { ProductCard } from "@/components/storefront/ProductCard";

const PAGE_SIZE = 12;

type CatNode = { id: string; name: string; slug: string; children?: CatNode[] };

type Product = {
  id: string; name: string; slug: string; brand: string | null;
  category: string | null; categorySlug: string | null;
  image: string | null; price: number; comparePrice: number | null; stock: number;
};

export function ProductosView() {
  const [filters] = useQueryStates(storefrontFilterParsers);
  const [q] = useQueryState("q", parseAsString.withDefault(""));
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault("newest"));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryTree, setCategoryTree] = useState<CatNode[]>([]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        const cats = d.categories || [];
        const roots: CatNode[] = [];
        const map = new Map<string, CatNode>();
        for (const c of cats) {
          map.set(c.id, { id: c.id, name: c.name, slug: c.slug, children: [] });
        }
        for (const c of cats) {
          const node = map.get(c.id)!;
          if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId)!.children!.push(node);
          } else {
            roots.push(node);
          }
        }
        setCategoryTree(roots);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters.category) params.set("category", filters.category);
    if (filters.marcas) params.set("marcas", filters.marcas);
    if (filters.stock) params.set("inStock", "true");
    if (filters.min != null) params.set("minPrice", String(filters.min));
    if (filters.max != null) params.set("maxPrice", String(filters.max));
    if (sort && sort !== "relevance") params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, filters.category, filters.marcas, filters.stock, filters.min, filters.max, sort, page]);

  const safePage = Math.min(page, totalPages);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">Inicio</Link>
        <span>/</span>
        <span className="text-foreground">Productos</span>
      </nav>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Catalogo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Cargando..." : total === 0 || total > 1 ? `${total} productos encontrados` : "1 producto encontrado"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="lg:hidden" type="button"><SlidersHorizontal className="size-4" />Filtros</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
              <DialogHeader><DialogTitle>Filtros</DialogTitle></DialogHeader>
              <FacetedFilters />
            </DialogContent>
          </Dialog>
          <Select value={sort} onValueChange={(v) => { void setSort(v); void setPage(1); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Mas relevantes</SelectItem>
              <SelectItem value="price_asc">Menor precio</SelectItem>
              <SelectItem value="price_desc">Mayor precio</SelectItem>
              <SelectItem value="newest">Mas nuevos</SelectItem>
              <SelectItem value="name_asc">Nombre A-Z</SelectItem>
              <SelectItem value="name_desc">Nombre Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <CategoryTree categories={categoryTree} activeCategorySlug={filters.category || undefined} />
          <div className="mt-6"><FacetedFilters /></div>
        </aside>

        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
              No encontramos productos con los filtros seleccionados.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 md:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button type="button" variant="outline" size="icon" disabled={safePage <= 1}
                onClick={() => void setPage(Math.max(1, safePage - 1))}><ChevronLeft className="size-4" /></Button>
              <span className="text-sm text-muted-foreground">Pagina {safePage} de {totalPages}</span>
              <Button type="button" variant="outline" size="icon" disabled={safePage >= totalPages}
                onClick={() => void setPage(Math.min(totalPages, safePage + 1))}><ChevronRight className="size-4" /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
