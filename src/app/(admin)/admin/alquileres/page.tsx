"use client";

import { Edit, Loader2, Plus, Power, Trash2, Wrench } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";

type Period = { id?: string; label: string; days: string; price: string };
type Tool = {
  id: string; name: string; description: string | null; imageUrl: string | null;
  deposit: number | null; availableQty: number; isActive: boolean;
  periods: { id: string; label: string; days: number; price: number }[];
};

const EMPTY_PERIOD: Period = { label: "", days: "", price: "" };

type FormState = {
  name: string; description: string; imageUrl: string; deposit: string;
  availableQty: string; isActive: boolean; periods: Period[];
};

const EMPTY: FormState = {
  name: "", description: "", imageUrl: "", deposit: "", availableQty: "1",
  isActive: true, periods: [{ ...EMPTY_PERIOD }],
};

export default function AdminAlquileresPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rentals");
      const data = await res.json();
      setTools(data.tools ?? []);
      setEnabled(data.enabled ?? true);
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggleGlobal(val: boolean) {
    setEnabled(val);
    await fetch("/api/admin/rentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", enabled: val }),
    });
    toast.success(val ? "Alquileres activados en la tienda" : "Alquileres desactivados");
  }

  function openNew() { setEditId(null); setForm(EMPTY); setDialog(true); }

  function openEdit(t: Tool) {
    setEditId(t.id);
    setForm({
      name: t.name, description: t.description || "", imageUrl: t.imageUrl || "",
      deposit: t.deposit ? String(t.deposit) : "", availableQty: String(t.availableQty),
      isActive: t.isActive,
      periods: t.periods.length > 0
        ? t.periods.map((p) => ({ id: p.id, label: p.label, days: String(p.days), price: String(p.price) }))
        : [{ ...EMPTY_PERIOD }],
    });
    setDialog(true);
  }

  function updatePeriod(i: number, field: keyof Period, val: string) {
    setForm((f) => {
      const p = [...f.periods];
      p[i] = { ...p[i], [field]: val };
      return { ...f, periods: p };
    });
  }
  function addPeriod() { setForm((f) => ({ ...f, periods: [...f.periods, { ...EMPTY_PERIOD }] })); }
  function removePeriod(i: number) { setForm((f) => ({ ...f, periods: f.periods.filter((_, j) => j !== i) })); }

  async function handleSave() {
    if (!form.name) { toast.error("El nombre es obligatorio"); return; }
    if (form.periods.length === 0) { toast.error("Agrega al menos un periodo"); return; }
    setSaving(true);
    try {
      const body: any = {
        ...form,
        periods: form.periods.filter((p) => p.label && p.days && p.price),
      };
      if (editId) body.id = editId;

      const res = await fetch("/api/admin/rentals", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { toast.success(editId ? "Actualizada" : "Creada"); setDialog(false); load(); }
      else { const d = await res.json(); toast.error(d.error || "Error"); }
    } catch { toast.error("Error de conexion"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/rentals?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Eliminada"); load(); }
    } catch { toast.error("Error"); }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Alquiler de herramientas</h1>
          <p className="text-sm text-muted-foreground">Administra las herramientas disponibles para alquiler.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2">
            <Label className="text-sm font-medium">Mostrar en tienda</Label>
            <Switch checked={enabled} onCheckedChange={toggleGlobal} />
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="size-4" />Nueva herramienta</Button>
        </div>
      </div>

      {!enabled && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 text-sm text-amber-800 flex items-center gap-3">
            <Power className="size-5 shrink-0" />
            La seccion de alquileres esta <strong>desactivada</strong>. No se muestra nada en la pagina principal.
          </CardContent>
        </Card>
      )}

      {tools.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">
          <Wrench className="mx-auto size-12 text-muted-foreground/50 mb-3" />
          <p className="font-medium">No hay herramientas cargadas</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Card key={t.id} className={`border-border shadow-sm ${!t.isActive ? "opacity-50" : ""}`}>
              {t.imageUrl && (
                <div className="relative h-40 overflow-hidden rounded-t-xl bg-muted">
                  <img src={t.imageUrl} alt="" className="size-full object-cover" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(t)}><Edit className="size-4" /></Button>
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => handleDelete(t.id)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{t.availableQty} disponible(s)</Badge>
                  {t.deposit && <Badge variant="outline">Deposito: {formatPrice(t.deposit)}</Badge>}
                  {!t.isActive && <Badge variant="destructive">Inactiva</Badge>}
                </div>
                <div className="space-y-1">
                  {t.periods.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{p.label}</span>
                      <span className="font-semibold">{formatPrice(p.price)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar herramienta" : "Nueva herramienta"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Nombre <span className="text-destructive">*</span></Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descripcion</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>URL de imagen</Label><Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Deposito garantia ($)</Label><Input type="number" value={form.deposit} onChange={(e) => setForm((f) => ({ ...f, deposit: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Cantidad disponible</Label><Input type="number" value={form.availableQty} onChange={(e) => setForm((f) => ({ ...f, availableQty: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} /><Label>Activa</Label></div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Periodos de alquiler</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPeriod} className="gap-1"><Plus className="size-3" />Agregar</Button>
              </div>
              {form.periods.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                  <div className="space-y-1"><Label className="text-xs">Nombre</Label><Input value={p.label} onChange={(e) => updatePeriod(i, "label", e.target.value)} placeholder="1 dia" /></div>
                  <div className="space-y-1"><Label className="text-xs">Dias</Label><Input type="number" value={p.days} onChange={(e) => updatePeriod(i, "days", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Precio</Label><Input type="number" value={p.price} onChange={(e) => updatePeriod(i, "price", e.target.value)} /></div>
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => removePeriod(i)} disabled={form.periods.length <= 1}><Trash2 className="size-3.5 text-destructive" /></Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{editId ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
