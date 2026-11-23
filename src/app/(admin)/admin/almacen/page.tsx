"use client";

import { Edit, Eye, Loader2, MapPin, Package, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Location = {
  id: string;
  name: string;
  code: string;
  maxRows: number;
  maxCols: number;
  label: string | null;
  isActive: boolean;
  _count: { products: number };
};

type LocationForm = {
  name: string;
  maxRows: string;
  maxCols: string;
  label: string;
};

const EMPTY_LOCATION: LocationForm = {
  name: "",
  maxRows: "",
  maxCols: "",
  label: "",
};

export default function AdminAlmacenPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_LOCATION);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/warehouse");
      const data = await res.json();
      setLocations(data.locations ?? []);
    } catch {
      toast.error("Error al cargar almacén");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_LOCATION);
    setDialogOpen(true);
  }

  function openEdit(loc: Location) {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      maxRows: String(loc.maxRows),
      maxCols: String(loc.maxCols),
      label: loc.label || "",
    });
    setDialogOpen(true);
  }

  async function saveLocation() {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const maxRows = Number(form.maxRows);
    const maxCols = Number(form.maxCols);
    if (
      !Number.isInteger(maxRows) ||
      !Number.isInteger(maxCols) ||
      maxRows < 1 ||
      maxCols < 1
    ) {
      toast.error("Indicá la cantidad máxima de filas y de columnas");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/warehouse", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name.trim(),
          maxRows,
          maxCols,
          label: form.label.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al guardar");
        return;
      }
      toast.success(editingId ? "Ubicación actualizada" : "Ubicación creada");
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLocation(loc: Location) {
    const extra =
      loc._count.products > 0
        ? ` Tiene ${loc._count.products} producto(s) asignado(s); van a quedar sin ubicación.`
        : "";
    if (!confirm(`¿Eliminar "${loc.name}" ${loc.code}?${extra}`)) return;

    try {
      const res = await fetch(`/api/admin/warehouse?id=${loc.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Error al eliminar");
        return;
      }
      toast.success("Ubicación eliminada");
      load();
    } catch {
      toast.error("Error al eliminar");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalProducts = locations.reduce(
    (acc, loc) => acc + loc._count.products,
    0,
  );
  const previewRows = Number(form.maxRows);
  const previewCols = Number(form.maxCols);
  const previewSize =
    Number.isInteger(previewRows) &&
    Number.isInteger(previewCols) &&
    previewRows > 0 &&
    previewCols > 0
      ? `${previewRows} × ${previewCols}`
      : "filas × columnas";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Almacén</h1>
          <p className="text-sm text-muted-foreground">
            Cada lugar tiene un nombre y declara cuántas filas y columnas tiene
            su grilla.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="size-4" />
          Nueva ubicación
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <MapPin className="size-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{locations.length}</p>
              <p className="text-xs text-muted-foreground">Ubicaciones</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Package className="size-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalProducts}</p>
              <p className="text-xs text-muted-foreground">Productos ubicados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {locations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <MapPin className="mx-auto mb-3 size-12 text-muted-foreground/50" />
            <p className="font-medium">No hay ubicaciones</p>
            <p className="text-sm">
              Creá una con nombre y el tamaño de la grilla. Por ejemplo,
              Estantería derecha con 3 filas y 4 columnas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={cn(
                "flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5",
                !loc.isActive && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{loc.name}</p>
                <p className="font-mono text-sm font-bold text-primary">
                  {loc.maxRows} × {loc.maxCols}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loc.maxRows} filas · {loc.maxCols} columnas
                </p>
                {loc.label ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {loc.label}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {loc._count.products} producto(s)
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  asChild
                  title="Ver grilla"
                >
                  <Link href={`/admin/almacen/${loc.id}`}>
                    <Eye className="size-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => openEdit(loc)}
                >
                  <Edit className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => deleteLocation(loc)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar ubicación" : "Nueva ubicación"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
                placeholder="Estantería derecha"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>
                  Cantidad de filas <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={form.maxRows}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      maxRows: e.target.value,
                    }))
                  }
                  placeholder="3"
                  className="text-center font-mono font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Cantidad de columnas{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={form.maxCols}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      maxCols: e.target.value,
                    }))
                  }
                  placeholder="4"
                  className="text-center font-mono font-bold"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Es el tamaño máximo de la grilla de este lugar.
            </p>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Grilla</p>
              <p className="font-mono text-lg font-bold text-primary">
                {previewSize}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Input
                value={form.label}
                onChange={(e) =>
                  setForm((current) => ({ ...current, label: e.target.value }))
                }
                placeholder="Ej: Griferías importadas"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveLocation} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {editingId ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
