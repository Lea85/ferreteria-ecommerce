"use client";

import { Edit, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type Campaign = {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  ctaText: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

type FormState = {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  ctaText: string;
  priority: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

const EMPTY_FORM: FormState = {
  title: "", subtitle: "", imageUrl: "", linkUrl: "", ctaText: "Ver mas",
  priority: "0", isActive: true, startsAt: "", endsAt: "",
};

export default function AdminCampanasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } catch {
      toast.error("Error al cargar campanias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCampaigns(); }, []);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      title: c.title || "",
      subtitle: c.subtitle || "",
      imageUrl: c.imageUrl,
      linkUrl: c.linkUrl || "",
      ctaText: c.ctaText || "Ver mas",
      priority: String(c.sortOrder),
      isActive: c.isActive,
      startsAt: c.startsAt ? c.startsAt.slice(0, 10) : "",
      endsAt: c.endsAt ? c.endsAt.slice(0, 10) : "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.imageUrl) {
      toast.error("La URL de imagen es obligatoria");
      return;
    }
    setSaving(true);
    try {
      const body = {
        id: editingId,
        title: form.title || null,
        subtitle: form.subtitle || null,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl || null,
        ctaText: form.ctaText || "Ver mas",
        priority: Number(form.priority) || 0,
        isActive: form.isActive,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };

      const res = await fetch("/api/admin/campaigns", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? "Campania actualizada" : "Campania creada");
        setDialogOpen(false);
        loadCampaigns();
      } else {
        toast.error("Error al guardar");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/campaigns?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Campania eliminada");
        loadCampaigns();
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  function isCurrentlyActive(c: Campaign): boolean {
    if (!c.isActive) return false;
    const now = new Date();
    if (c.startsAt && new Date(c.startsAt) > now) return false;
    if (c.endsAt && new Date(c.endsAt) < now) return false;
    return true;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Campanias</h1>
          <p className="text-sm text-muted-foreground">
            Administra los banners del carrusel de la pagina principal.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="size-4" />Nueva campania</Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ImageIcon className="size-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay campanias creadas.</p>
            <Button onClick={openNew}>Crear primera campania</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <Card key={c.id} className="overflow-hidden border-border shadow-sm">
              <div className="flex flex-col sm:flex-row">
                <div className="relative aspect-video w-full sm:aspect-[16/7] sm:w-64 shrink-0 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt={c.title || "Campania"} className="absolute inset-0 size-full object-cover" />
                </div>
                <CardContent className="flex flex-1 flex-col justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{c.title || "(Sin titulo)"}</h3>
                      <Badge variant={isCurrentlyActive(c) ? "default" : "secondary"}>
                        {isCurrentlyActive(c) ? "Activa" : c.isActive ? "Programada" : "Inactiva"}
                      </Badge>
                      <Badge variant="outline">Prioridad: {c.sortOrder}</Badge>
                    </div>
                    {c.subtitle && <p className="mt-1 text-sm text-muted-foreground">{c.subtitle}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {c.linkUrl && <span>Enlace: {c.linkUrl}</span>}
                      {c.ctaText && <span>Boton: "{c.ctaText}"</span>}
                      {c.startsAt && <span>Desde: {new Date(c.startsAt).toLocaleDateString("es-AR")}</span>}
                      {c.endsAt && <span>Hasta: {new Date(c.endsAt).toLocaleDateString("es-AR")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(c)}>
                      <Edit className="size-3.5" />Editar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="size-3.5" />Eliminar
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar campania" : "Nueva campania"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: 25% OFF en griferias" />
            </div>
            <div className="space-y-2">
              <Label>Subtitulo</Label>
              <Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="Texto secundario" />
            </div>
            <div className="space-y-2">
              <Label>URL de imagen <span className="text-destructive">*</span></Label>
              <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://... o pegar URL de imagen" />
              {form.imageUrl && (
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt="Preview" className="h-32 w-full object-cover" />
                </div>
              )}
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Texto del boton (CTA)</Label>
                <Input value={form.ctaText} onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))} placeholder="Ver mas" />
              </div>
              <div className="space-y-2">
                <Label>Enlace del boton</Label>
                <Input value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} placeholder="/productos?sort=discount" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prioridad (menor = primero)</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                <Label>Activa</Label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha de inicio</Label>
                <Input type="date" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de fin</Label>
                <Input type="date" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {editingId ? "Guardar" : "Crear campania"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
