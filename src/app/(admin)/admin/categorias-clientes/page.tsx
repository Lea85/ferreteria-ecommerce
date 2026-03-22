"use client";

import { Edit, Loader2, Plus, Trash2, Users } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

type CustCat = {
  id: string;
  name: string;
  description: string | null;
  benefitType: string;
  benefitValue: number;
  minAmount: number | null;
  minQuantity: number | null;
  isActive: boolean;
  _count: { users: number };
};

const BENEFIT_LABELS: Record<string, string> = {
  DISCOUNT_PERCENT: "Descuento %",
  DISCOUNT_AMOUNT: "Descuento fijo ($)",
  VOLUME_DISCOUNT: "Descuento por volumen",
  FREE_SHIPPING: "Envio gratis",
};

const EMPTY = { name: "", description: "", benefitType: "DISCOUNT_PERCENT", benefitValue: "0", minAmount: "", minQuantity: "", isActive: true };

export default function AdminCategoriasClientesPage() {
  const [cats, setCats] = useState<CustCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customer-categories");
      const data = await res.json();
      setCats(data.categories ?? []);
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditingId(null); setForm(EMPTY); setDialogOpen(true); }

  function openEdit(c: CustCat) {
    setEditingId(c.id);
    setForm({
      name: c.name, description: c.description || "", benefitType: c.benefitType,
      benefitValue: String(c.benefitValue), minAmount: c.minAmount ? String(c.minAmount) : "",
      minQuantity: c.minQuantity ? String(c.minQuantity) : "", isActive: c.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const body = { id: editingId, ...form, benefitValue: Number(form.benefitValue), minAmount: form.minAmount || null, minQuantity: form.minQuantity || null };
      const res = await fetch("/api/admin/customer-categories", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { toast.success(editingId ? "Actualizada" : "Creada"); setDialogOpen(false); load(); }
      else toast.error("Error al guardar");
    } catch { toast.error("Error de conexion"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/customer-categories?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Eliminada"); load(); }
    } catch { toast.error("Error al eliminar"); }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Categorias de clientes</h1>
          <p className="text-sm text-muted-foreground">Crea categorias con beneficios especiales para tus clientes.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="size-4" />Nueva categoria</Button>
      </div>

      {cats.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">No hay categorias creadas.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <Card key={c.id} className={`border-border shadow-sm ${!c.isActive ? "opacity-60" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(c)}><Edit className="size-4" /></Button>
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => handleDelete(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </div>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{BENEFIT_LABELS[c.benefitType] || c.benefitType}</Badge>
                  {c.benefitType !== "FREE_SHIPPING" && <Badge variant="outline">{c.benefitType.includes("PERCENT") ? `${c.benefitValue}%` : `$${c.benefitValue}`}</Badge>}
                  {!c.isActive && <Badge variant="destructive">Inactiva</Badge>}
                </div>
                {c.minAmount && <p className="text-xs text-muted-foreground">Monto minimo: ${c.minAmount}</p>}
                {c.minQuantity && <p className="text-xs text-muted-foreground">Cantidad minima: {c.minQuantity} u.</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5" />{c._count.users} clientes asignados</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar categoria" : "Nueva categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Nombre <span className="text-destructive">*</span></Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descripcion</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Tipo de beneficio</Label>
              <Select value={form.benefitType} onValueChange={(v) => setForm((f) => ({ ...f, benefitType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISCOUNT_PERCENT">Descuento porcentual (%)</SelectItem>
                  <SelectItem value="DISCOUNT_AMOUNT">Descuento fijo ($)</SelectItem>
                  <SelectItem value="VOLUME_DISCOUNT">Descuento por volumen</SelectItem>
                  <SelectItem value="FREE_SHIPPING">Envio gratis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.benefitType !== "FREE_SHIPPING" && (
              <div className="space-y-2"><Label>Valor del beneficio</Label><Input type="number" value={form.benefitValue} onChange={(e) => setForm((f) => ({ ...f, benefitValue: e.target.value }))} /></div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Monto minimo ($)</Label><Input type="number" value={form.minAmount} onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))} placeholder="Sin minimo" /></div>
              <div className="space-y-2"><Label>Cantidad minima (u.)</Label><Input type="number" value={form.minQuantity} onChange={(e) => setForm((f) => ({ ...f, minQuantity: e.target.value }))} placeholder="Sin minimo" /></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} /><Label>Activa</Label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{editingId ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
