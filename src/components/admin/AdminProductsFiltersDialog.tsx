"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type FilterOption = { id: string; name: string };

export type AdminProductsFiltersValue = {
  active: string;
  brandIds: string[];
  supplierIds: string[];
};

type FilterCheckboxListProps = {
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  searchPlaceholder: string;
};

function FilterCheckboxList({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder,
}: FilterCheckboxListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.name.toLowerCase().includes(q));
  }, [options, query]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function selectVisible() {
    const next = new Set(selected);
    for (const option of filtered) next.add(option.id);
    onChange(next);
  }

  function clearSection() {
    onChange(new Set());
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="shrink-0 text-xs text-muted-foreground">
          {selected.size} seleccionados
        </span>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-9"
      />
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={selectVisible}
          disabled={filtered.length === 0}
        >
          Seleccionar visibles
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={clearSection}
          disabled={selected.size === 0}
        >
          Limpiar sección
        </Button>
      </div>
      <div className="min-h-[220px] max-h-72 overflow-y-auto rounded-md border border-border p-2">
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            Sin resultados para la búsqueda.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((option) => (
              <li key={option.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                  <Checkbox
                    checked={selected.has(option.id)}
                    onCheckedChange={() => toggle(option.id)}
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-snug">{option.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type AdminProductsFiltersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: FilterOption[];
  suppliers: FilterOption[];
  showBrands: boolean;
  applied: AdminProductsFiltersValue;
  onApply: (value: AdminProductsFiltersValue) => void;
};

export function AdminProductsFiltersDialog({
  open,
  onOpenChange,
  brands,
  suppliers,
  showBrands,
  applied,
  onApply,
}: AdminProductsFiltersDialogProps) {
  const [active, setActive] = useState(applied.active);
  const [brandIds, setBrandIds] = useState<Set<string>>(
    () => new Set(applied.brandIds),
  );
  const [supplierIds, setSupplierIds] = useState<Set<string>>(
    () => new Set(applied.supplierIds),
  );

  useEffect(() => {
    if (!open) return;
    setActive(applied.active);
    setBrandIds(new Set(applied.brandIds));
    setSupplierIds(new Set(applied.supplierIds));
  }, [open, applied]);

  function handleClearDraft() {
    setActive("all");
    setBrandIds(new Set());
    setSupplierIds(new Set());
  }

  function handleApply() {
    onApply({
      active,
      brandIds: [...brandIds],
      supplierIds: [...supplierIds],
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Filtros de productos</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Varias marcas o proveedores se combinan con OR. Entre secciones se
            aplican todas a la vez.
          </p>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Visibilidad</Label>
            <Select value={active} onValueChange={setActive}>
              <SelectTrigger className="w-full max-w-xs border-border">
                <SelectValue placeholder="Visibilidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Solo activos</SelectItem>
                <SelectItem value="false">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div
            className={
              showBrands
                ? "grid gap-6 md:grid-cols-2"
                : "grid gap-6 md:grid-cols-1"
            }
          >
            {showBrands ? (
              <FilterCheckboxList
                label="Marcas"
                options={brands}
                selected={brandIds}
                onChange={setBrandIds}
                searchPlaceholder="Buscar marca…"
              />
            ) : null}
            <FilterCheckboxList
              label="Proveedores"
              options={suppliers}
              selected={supplierIds}
              onChange={setSupplierIds}
              searchPlaceholder="Buscar proveedor…"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4 sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleClearDraft}>
            Limpiar filtros
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleApply}>
              Aplicar filtros
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
