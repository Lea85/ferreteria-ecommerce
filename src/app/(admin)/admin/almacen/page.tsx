"use client";

import {
  Edit, Loader2, MapPin, Package, Plus, Trash2, Warehouse,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Location = {
  id: string;
  code: string;
  shelf: string;
  row: string;
  col: string;
  label: string | null;
  isActive: boolean;
  _count: { products: number };
};

type Sector = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  locations: Location[];
};

type SectorForm = { name: string; description: string };
type LocationForm = { sectorId: string; shelf: string; row: string; col: string; label: string };

const EMPTY_SECTOR: SectorForm = { name: "", description: "" };
const EMPTY_LOCATION: LocationForm = { sectorId: "", shelf: "", row: "", col: "", label: "" };

export default function AdminAlmacenPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorDialog, setSectorDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [sectorForm, setSectorForm] = useState(EMPTY_SECTOR);
  const [locationForm, setLocationForm] = useState(EMPTY_LOCATION);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/warehouse");
      const data = await res.json();
      setSectors(data.sectors ?? []);
    } catch { toast.error("Error al cargar almacen"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // Sector CRUD
  function openNewSector() {
    setEditingSectorId(null); setSectorForm(EMPTY_SECTOR); setSectorDialog(true);
  }
  function openEditSector(s: Sector) {
    setEditingSectorId(s.id); setSectorForm({ name: s.name, description: s.description || "" }); setSectorDialog(true);
  }
  async function saveSector() {
    if (!sectorForm.name) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const body = editingSectorId
        ? { type: "sector", id: editingSectorId, ...sectorForm }
        : { type: "sector", ...sectorForm };
      const res = await fetch("/api/admin/warehouse", {
        method: editingSectorId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { toast.success(editingSectorId ? "Sector actualizado" : "Sector creado"); setSectorDialog(false); load(); }
      else { const d = await res.json(); toast.error(d.error || "Error al guardar"); }
    } catch { toast.error("Error de conexion"); }
    finally { setSaving(false); }
  }
  async function deleteSector(id: string) {
    const sector = sectors.find((s) => s.id === id);
    if (sector && sector.locations.length > 0) {
      toast.error("Elimina primero las ubicaciones de este sector");
      return;
    }
    try {
      const res = await fetch(`/api/admin/warehouse?type=sector&id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Sector eliminado"); load(); }
    } catch { toast.error("Error al eliminar"); }
  }
  async function toggleSector(id: string, isActive: boolean) {
    try {
      await fetch("/api/admin/warehouse", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sector", id, isActive }),
      });
      toast.success(isActive ? "Sector activado" : "Sector desactivado");
      load();
    } catch { toast.error("Error"); }
  }

  // Location CRUD
  function openNewLocation(sectorId: string) {
    setEditingLocationId(null); setLocationForm({ ...EMPTY_LOCATION, sectorId }); setLocationDialog(true);
  }
  function openEditLocation(loc: Location, sectorId: string) {
    setEditingLocationId(loc.id);
    setLocationForm({ sectorId, shelf: loc.shelf, row: loc.row, col: loc.col, label: loc.label || "" });
    setLocationDialog(true);
  }
  async function saveLocation() {
    if (!locationForm.shelf || !locationForm.row || !locationForm.col) {
      toast.error("Estanteria, fila y columna son obligatorios"); return;
    }
    setSaving(true);
    try {
      const body = editingLocationId
        ? { type: "location", id: editingLocationId, ...locationForm }
        : { type: "location", ...locationForm };
      const res = await fetch("/api/admin/warehouse", {
        method: editingLocationId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { toast.success(editingLocationId ? "Ubicacion actualizada" : "Ubicacion creada"); setLocationDialog(false); load(); }
      else { const d = await res.json(); toast.error(d.error || "Error al guardar"); }
    } catch { toast.error("Error de conexion"); }
    finally { setSaving(false); }
  }
  async function deleteLocation(id: string) {
    try {
      const res = await fetch(`/api/admin/warehouse?type=location&id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Ubicacion eliminada"); load(); }
    } catch { toast.error("Error al eliminar"); }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;

  const totalLocations = sectors.reduce((acc, s) => acc + s.locations.length, 0);
  const totalProducts = sectors.reduce((acc, s) => acc + s.locations.reduce((a, l) => a + l._count.products, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Almacen</h1>
          <p className="text-sm text-muted-foreground">Administra los sectores y ubicaciones del deposito.</p>
        </div>
        <Button onClick={openNewSector} className="gap-2"><Plus className="size-4" />Nuevo sector</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10"><Warehouse className="size-6 text-primary" /></div>
          <div><p className="text-2xl font-bold">{sectors.length}</p><p className="text-xs text-muted-foreground">Sectores</p></div>
        </CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10"><MapPin className="size-6 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{totalLocations}</p><p className="text-xs text-muted-foreground">Ubicaciones</p></div>
        </CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10"><Package className="size-6 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{totalProducts}</p><p className="text-xs text-muted-foreground">Productos ubicados</p></div>
        </CardContent></Card>
      </div>

      {/* Sectors */}
      {sectors.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">
          <Warehouse className="mx-auto size-12 text-muted-foreground/50 mb-3" />
          <p className="font-medium">No hay sectores creados</p>
          <p className="text-sm">Crea un sector para empezar a organizar el almacen.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {sectors.map((sector) => (
            <Card key={sector.id} className={cn("border-border shadow-sm", !sector.isActive && "opacity-50 border-dashed")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", sector.isActive ? "bg-primary/10" : "bg-destructive/10")}>
                    <Warehouse className={cn("size-5", sector.isActive ? "text-primary" : "text-destructive")} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{sector.name}</CardTitle>
                    {sector.description && <p className="text-xs text-muted-foreground">{sector.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{sector.locations.length} ubicaciones</Badge>
                  <Switch checked={sector.isActive} onCheckedChange={(v) => toggleSector(sector.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => openEditSector(sector)}><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteSector(sector.id)}><Trash2 className="size-4 text-destructive" /></Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openNewLocation(sector.id)}><Plus className="size-3" />Ubicacion</Button>
                </div>
              </CardHeader>
              {sector.locations.length > 0 && (
                <CardContent className="pt-0">
                  <Separator className="mb-3" />
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sector.locations.map((loc) => (
                      <div key={loc.id} className={cn("flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5", !loc.isActive && "opacity-50")}>
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-primary">{loc.code}</p>
                          <p className="text-xs text-muted-foreground">
                            Est. {loc.shelf} · Fila {loc.row} · Col {loc.col}
                          </p>
                          {loc.label && <p className="text-xs text-muted-foreground truncate">{loc.label}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{loc._count.products} producto(s)</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditLocation(loc, sector.id)}><Edit className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => deleteLocation(loc.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Sector */}
      <Dialog open={sectorDialog} onOpenChange={setSectorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingSectorId ? "Editar sector" : "Nuevo sector"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Nombre <span className="text-destructive">*</span></Label><Input value={sectorForm.name} onChange={(e) => setSectorForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej: Sector A, Deposito principal" /></div>
            <div className="space-y-2"><Label>Descripcion</Label><Input value={sectorForm.description} onChange={(e) => setSectorForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripcion opcional" /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setSectorDialog(false)}>Cancelar</Button>
              <Button onClick={saveSector} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{editingSectorId ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Ubicacion */}
      <Dialog open={locationDialog} onOpenChange={setLocationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingLocationId ? "Editar ubicacion" : "Nueva ubicacion"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select value={locationForm.sectorId} onValueChange={(v) => setLocationForm((f) => ({ ...f, sectorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar sector" /></SelectTrigger>
                <SelectContent>
                  {sectors.filter((s) => s.isActive).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Estanteria <span className="text-destructive">*</span></Label><Input value={locationForm.shelf} onChange={(e) => setLocationForm((f) => ({ ...f, shelf: e.target.value }))} placeholder="A" className="text-center font-mono font-bold" /></div>
              <div className="space-y-2"><Label>Fila <span className="text-destructive">*</span></Label><Input value={locationForm.row} onChange={(e) => setLocationForm((f) => ({ ...f, row: e.target.value }))} placeholder="3" className="text-center font-mono font-bold" /></div>
              <div className="space-y-2"><Label>Columna <span className="text-destructive">*</span></Label><Input value={locationForm.col} onChange={(e) => setLocationForm((f) => ({ ...f, col: e.target.value }))} placeholder="4" className="text-center font-mono font-bold" /></div>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Codigo generado:</p>
              <p className="font-mono text-lg font-bold text-primary">{locationForm.shelf || "?"}-{locationForm.row || "?"}-{locationForm.col || "?"}</p>
            </div>
            <div className="space-y-2"><Label>Etiqueta (opcional)</Label><Input value={locationForm.label} onChange={(e) => setLocationForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ej: Griferias importadas" /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setLocationDialog(false)}>Cancelar</Button>
              <Button onClick={saveLocation} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{editingLocationId ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
