"use client";

import { useEffect, useMemo, useState } from "react";
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryState,
  useQueryStates,
} from "nuqs";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MOCK_BRAND_NAMES,
  MOCK_CATEGORIES_GRID,
} from "@/lib/mock-data";

export const storefrontFilterParsers = {
  min: parseAsInteger,
  max: parseAsInteger,
  marcas: parseAsString.withDefault(""),
  category: parseAsString.withDefault(""),
  stock: parseAsBoolean.withDefault(false),
};

type Draft = {
  min: string;
  max: string;
  brands: Set<string>;
  category: string;
  stock: boolean;
};

function parseDraftFromQuery(q: {
  min: number | null;
  max: number | null;
  marcas: string;
  category: string;
  stock: boolean;
}): Draft {
  return {
    min: q.min != null ? String(q.min) : "",
    max: q.max != null ? String(q.max) : "",
    brands: new Set(
      q.marcas
        ? q.marcas.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    ),
    category: q.category ?? "",
    stock: q.stock,
  };
}

export function FacetedFilters() {
  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [query, setQuery] = useQueryStates(storefrontFilterParsers, {
    history: "replace",
    shallow: false,
  });

  const [draft, setDraft] = useState<Draft>(() => parseDraftFromQuery(query));

  useEffect(() => {
    setDraft(parseDraftFromQuery(query));
  }, [query.min, query.max, query.marcas, query.category, query.stock]);

  const brandList = useMemo(() => MOCK_BRAND_NAMES, []);

  function apply() {
    void setPage(1);
    void setQuery({
      min: draft.min ? Number(draft.min) : null,
      max: draft.max ? Number(draft.max) : null,
      marcas:
        draft.brands.size > 0 ? Array.from(draft.brands).join(",") : null,
      category: draft.category || null,
      stock: draft.stock ? true : null,
    });
  }

  function clear() {
    setDraft({
      min: "",
      max: "",
      brands: new Set(),
      category: "",
      stock: false,
    });
    void setPage(1);
    void setQuery({
      min: null,
      max: null,
      marcas: null,
      category: null,
      stock: null,
    });
  }

  function toggleBrand(b: string) {
    setDraft((d) => {
      const next = new Set(d.brands);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return { ...d, brands: next };
    });
  }

  const filterBody = (
    <div className="space-y-6">
      <div className="space-y-3 md:hidden">
        <Accordion type="multiple" defaultValue={["precio", "marca", "cat", "stock"]}>
          <AccordionItem value="precio">
            <AccordionTrigger>Precio</AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="min-m">Mínimo</Label>
                  <Input
                    id="min-m"
                    inputMode="numeric"
                    placeholder="Min"
                    value={draft.min}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, min: e.target.value }))
                    }
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="max-m">Máximo</Label>
                  <Input
                    id="max-m"
                    inputMode="numeric"
                    placeholder="Max"
                    value={draft.max}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, max: e.target.value }))
                    }
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="marca">
            <AccordionTrigger>Marca</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {brandList.map((b) => (
                <label
                  key={b}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={draft.brands.has(b)}
                    onCheckedChange={() => toggleBrand(b)}
                  />
                  {b}
                </label>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="cat">
            <AccordionTrigger>Categoría</AccordionTrigger>
            <AccordionContent>
              <Select
                value={draft.category || "all"}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    category: v === "all" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {MOCK_CATEGORIES_GRID.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="stock">
            <AccordionTrigger>Disponibilidad</AccordionTrigger>
            <AccordionContent>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="solo-stock-m" className="cursor-pointer">
                  Solo con stock
                </Label>
                <Switch
                  id="solo-stock-m"
                  checked={draft.stock}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, stock: Boolean(v) }))
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="hidden space-y-8 md:block">
        <div>
          <h3 className="mb-3 text-sm font-semibold">Precio</h3>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="min-d">Mínimo</Label>
              <Input
                id="min-d"
                inputMode="numeric"
                placeholder="Min"
                value={draft.min}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, min: e.target.value }))
                }
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="max-d">Máximo</Label>
              <Input
                id="max-d"
                inputMode="numeric"
                placeholder="Max"
                value={draft.max}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, max: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Marca</h3>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {brandList.map((b) => (
              <label
                key={b}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={draft.brands.has(b)}
                  onCheckedChange={() => toggleBrand(b)}
                />
                {b}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Categoría</h3>
          <Select
            value={draft.category || "all"}
            onValueChange={(v) =>
              setDraft((d) => ({
                ...d,
                category: v === "all" ? "" : v,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {MOCK_CATEGORIES_GRID.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <Label htmlFor="solo-stock-d" className="cursor-pointer">
            Solo con stock
          </Label>
          <Switch
            id="solo-stock-d"
            checked={draft.stock}
            onCheckedChange={(v) =>
              setDraft((d) => ({ ...d, stock: Boolean(v) }))
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
          onClick={apply}
        >
          Aplicar filtros
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={clear}>
          Limpiar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-foreground">Filtros</h2>
      {filterBody}
    </div>
  );
}
