"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FilterOption } from "@/components/admin/AdminProductsFiltersDialog";

const ACTIVE_LABELS: Record<string, string> = {
  true: "Solo activos",
  false: "Solo inactivos",
};

type AdminProductsActiveFilterChipsProps = {
  active: string;
  brandIds: string[];
  supplierIds: string[];
  brands: FilterOption[];
  suppliers: FilterOption[];
  showBrands: boolean;
  onRemoveActive: () => void;
  onRemoveBrand: (id: string) => void;
  onRemoveSupplier: (id: string) => void;
  onClearAll: () => void;
};

export function AdminProductsActiveFilterChips({
  active,
  brandIds,
  supplierIds,
  brands,
  suppliers,
  showBrands,
  onRemoveActive,
  onRemoveBrand,
  onRemoveSupplier,
  onClearAll,
}: AdminProductsActiveFilterChipsProps) {
  const brandMap = new Map(brands.map((b) => [b.id, b.name]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  const hasActive = active !== "all";
  const hasBrands = showBrands && brandIds.length > 0;
  const hasSuppliers = supplierIds.length > 0;

  if (!hasActive && !hasBrands && !hasSuppliers) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasActive ? (
        <Badge variant="secondary" className="gap-1 pr-1 font-normal">
          Visibilidad: {ACTIVE_LABELS[active] ?? active}
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-muted"
            aria-label="Quitar filtro de visibilidad"
            onClick={onRemoveActive}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ) : null}

      {showBrands
        ? brandIds.map((id) => (
            <Badge
              key={`brand-${id}`}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              Marca: {brandMap.get(id) ?? "—"}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                aria-label={`Quitar marca ${brandMap.get(id) ?? id}`}
                onClick={() => onRemoveBrand(id)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))
        : null}

      {supplierIds.map((id) => (
        <Badge
          key={`supplier-${id}`}
          variant="secondary"
          className="gap-1 pr-1 font-normal"
        >
          Proveedor: {supplierMap.get(id) ?? "—"}
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-muted"
            aria-label={`Quitar proveedor ${supplierMap.get(id) ?? id}`}
            onClick={() => onRemoveSupplier(id)}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={onClearAll}
      >
        Limpiar todo
      </Button>
    </div>
  );
}
