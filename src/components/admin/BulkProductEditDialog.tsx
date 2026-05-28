"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

type BulkProductEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  productNames: string[];
  brands: Option[];
  suppliers: Option[];
  onSuccess: () => void;
};

export function BulkProductEditDialog({
  open,
  onOpenChange,
  productIds,
  productNames,
  brands,
  suppliers,
  onSuccess,
}: BulkProductEditDialogProps) {
  const [categories, setCategories] = useState<Option[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [saving, setSaving] = useState(false);

  const [applyBrand, setApplyBrand] = useState(false);
  const [brandId, setBrandId] = useState<string>("");

  const [applyCategories, setApplyCategories] = useState(false);
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());

  const [applySuppliers, setApplySuppliers] = useState(false);
  const [supplierIds, setSupplierIds] = useState<Set<string>>(new Set());

  const [applyActive, setApplyActive] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [applyFeatured, setApplyFeatured] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingCats(true);
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        setCategories(
          (d.categories ?? []).map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          })),
        );
      })
      .catch(() => toast.error("No se pudieron cargar categorías"))
      .finally(() => setLoadingCats(false));
  }, [open]);

  function resetForm() {
    setApplyBrand(false);
    setBrandId("");
    setApplyCategories(false);
    setCategoryIds(new Set());
    setApplySuppliers(false);
    setSupplierIds(new Set());
    setApplyActive(false);
    setIsActive(true);
    setApplyFeatured(false);
    setIsFeatured(false);
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSupplier(id: string) {
    setSupplierIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!applyBrand && !applyCategories && !applySuppliers && !applyActive && !applyFeatured) {
      toast.error("Activá al menos un atributo para modificar");
      return;
    }

    const payload: Record<string, unknown> = { productIds };

    if (applyBrand) {
      payload.brandId = { value: brandId || null };
    }
    if (applyCategories) {
      payload.categoryIds = { value: [...categoryIds] };
    }
    if (applySuppliers) {
      payload.supplierIds = { value: [...supplierIds] };
    }
    if (applyActive) {
      payload.isActive = { value: isActive };
    }
    if (applyFeatured) {
      payload.isFeatured = { value: isFeatured };
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al guardar");
        return;
      }
      toast.success(`${data.updated} producto(s) actualizado(s)`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edición masiva web</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {productIds.length} producto(s) seleccionado(s). Marcá qué atributos querés
          cambiar; solo esos campos se actualizarán en todos.
        </p>

        <ul className="max-h-24 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {productNames.slice(0, 12).map((name) => (
            <li key={name} className="truncate">
              · {name}
            </li>
          ))}
          {productNames.length > 12 ? (
            <li className="font-medium">… y {productNames.length - 12} más</li>
          ) : null}
        </ul>

        <div className="space-y-5">
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="apply-brand"
                checked={applyBrand}
                onCheckedChange={(v) => setApplyBrand(Boolean(v))}
              />
              <Label htmlFor="apply-brand" className="font-medium">
                Marca
              </Label>
            </div>
            {applyBrand && (
              <Select value={brandId || "__none__"} onValueChange={(v) => setBrandId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="border-border">
                  <SelectValue placeholder="Elegir marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin marca</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="apply-categories"
                checked={applyCategories}
                onCheckedChange={(v) => setApplyCategories(Boolean(v))}
              />
              <Label htmlFor="apply-categories" className="font-medium">
                Categorías
              </Label>
            </div>
            {applyCategories && (
              <div
                className={cn(
                  "max-h-36 space-y-2 overflow-y-auto rounded-md border border-border p-2",
                  loadingCats && "opacity-60",
                )}
              >
                {loadingCats ? (
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                ) : categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin categorías</p>
                ) : (
                  categories.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={categoryIds.has(c.id)}
                        onCheckedChange={() => toggleCategory(c.id)}
                      />
                      {c.name}
                    </label>
                  ))
                )}
              </div>
            )}
            {applyCategories && (
              <p className="text-xs text-muted-foreground">
                Reemplaza las categorías actuales de cada producto por las seleccionadas.
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="apply-suppliers"
                checked={applySuppliers}
                onCheckedChange={(v) => setApplySuppliers(Boolean(v))}
              />
              <Label htmlFor="apply-suppliers" className="font-medium">
                Proveedores
              </Label>
            </div>
            {applySuppliers && (
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                {suppliers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin proveedores</p>
                ) : (
                  suppliers.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={supplierIds.has(s.id)}
                        onCheckedChange={() => toggleSupplier(s.id)}
                      />
                      {s.name}
                    </label>
                  ))
                )}
              </div>
            )}
            {applySuppliers && (
              <p className="text-xs text-muted-foreground">
                Reemplaza los proveedores actuales por los seleccionados.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="apply-active"
                checked={applyActive}
                onCheckedChange={(v) => setApplyActive(Boolean(v))}
              />
              <Label htmlFor="apply-active" className="font-medium">
                Estado activo
              </Label>
            </div>
            {applyActive && (
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="apply-featured"
                checked={applyFeatured}
                onCheckedChange={(v) => setApplyFeatured(Boolean(v))}
              />
              <Label htmlFor="apply-featured" className="font-medium">
                Destacado en tienda
              </Label>
            </div>
            {applyFeatured && (
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Aplicar cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
