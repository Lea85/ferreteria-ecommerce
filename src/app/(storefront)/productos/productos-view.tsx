"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
  useQueryStates,
} from "nuqs";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

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
import { useIsAdmin } from "@/hooks/use-is-admin";

const PAGE_SIZE = 12;
const CATALOG_VIEW_KEY = "ferreteria-catalog-view";

type CatalogViewMode = "grid" | "list";

type CatNode = { id: string; name: string; slug: string; children?: CatNode[] };

type Product = {
  id: string; name: string; slug: string; brand: string | null;
  category: string | null; categorySlug: string | null;
  image: string | null; price: number; comparePrice: number | null; stock: number;
};

type SearchFacets = {
  brands: { name: string; count: number }[];
  categories: { name: string; slug: string; count: number }[];
};

export function ProductosView() {
  const isStaff = useIsAdmin();
  const [filters] = useQueryStates(storefrontFilterParsers);
  const [q] = useQueryState("q", parseAsString.withDefault(""));
  const [sortParam, setSort] = useQueryState("sort", parseAsString);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  /** Admin/mostrador: A–Z por defecto al buscar en el catálogo. */
  const sort = sortParam ?? (isStaff ? "name_asc" : "newest");

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryTree, setCategoryTree] = useState<CatNode[]>([]);
  const [searchFacets, setSearchFacets] = useState<SearchFacets | null>(null);
  const [searchFiltersOpen, setSearchFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CatalogViewMode>("grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CATALOG_VIEW_KEY);
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function changeViewMode(mode: CatalogViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem(CATALOG_VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  const isSearchMode = q.trim().length > 0;
  const activeFilterCount =
    (filters.marcas ? filters.marcas.split(",").filter(Boolean).length : 0) +
    (filters.category ? 1 : 0);

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
        if (d.facets) {
          setSearchFacets(d.facets);
        } else if (!q) {
          setSearchFacets(null);
        }
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {isSearchMode ? `Resultados para "${q}"` : "Catalogo"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Cargando..." : total === 0 || total > 1 ? `${total} productos encontrados` : "1 producto encontrado"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSearchMode ? (
            <Dialog open={searchFiltersOpen} onOpenChange={setSearchFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" type="button" className="gap-2">
                  <SlidersHorizontal className="size-4" />
                  Filtrar resultados
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Filtrar resultados de búsqueda</DialogTitle>
                </DialogHeader>
                <FacetedFilters
                  searchResultsMode
                  scopeBrands={searchFacets?.brands}
                  scopeCategories={searchFacets?.categories}
                />
              </DialogContent>
            </Dialog>
          ) : null}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="lg:hidden" type="button"><SlidersHorizontal className="size-4" />Filtros</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
              <DialogHeader><DialogTitle>Filtros</DialogTitle></DialogHeader>
              <FacetedFilters />
            </DialogContent>
          </Dialog>
          <div
            className="flex rounded-md border border-border p-0.5"
            role="group"
            aria-label="Vista de resultados"
          >
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="size-9 shrink-0"
              onClick={() => changeViewMode("grid")}
              aria-label="Vista en viñetas"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="size-9 shrink-0"
              onClick={() => changeViewMode("list")}
              aria-label="Vista en lista"
              aria-pressed={viewMode === "list"}
            >
              <List className="size-4" />
            </Button>
          </div>
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
          {!isSearchMode ? (
            <CategoryTree categories={categoryTree} activeCategorySlug={filters.category || undefined} />
          ) : null}
          <div className={isSearchMode ? "" : "mt-6"}>
            <FacetedFilters
              searchResultsMode={isSearchMode}
              scopeBrands={isSearchMode ? searchFacets?.brands : undefined}
              scopeCategories={isSearchMode ? searchFacets?.categories : undefined}
            />
          </div>
        </aside>

        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
              No encontramos productos con los filtros seleccionados.
            </p>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 md:gap-6"
                  : "flex flex-col gap-3"
              }
            >
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  layout={viewMode}
                />
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
