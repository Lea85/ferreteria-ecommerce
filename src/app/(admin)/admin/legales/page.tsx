"use client";

import { Download, Edit, FileText, Loader2, Plus, Printer, Trash2 } from "lucide-react";
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

type LegalDoc = {
  id: string; slug: string; title: string; content: string; isActive: boolean;
  createdAt: string; updatedAt: string;
};

type FormState = { title: string; slug: string; content: string; isActive: boolean };
const EMPTY: FormState = { title: "", slug: "", content: "", isActive: true };

function printDocument(title: string, content: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#222;line-height:1.6}
    h1{border-bottom:2px solid #333;padding-bottom:8px}pre{white-space:pre-wrap;font-family:inherit}
    @media print{body{margin:20px}}</style></head>
    <body><h1>${title}</h1><pre>${content}</pre>
    <script>window.print();<\/script></body></html>`);
  w.document.close();
}

function downloadDocument(title: string, content: string) {
  const blob = new Blob([`${title}\n${"=".repeat(title.length)}\n\n${content}`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminLegalesPage() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/legals");
      const data = await res.json();
      setDocs(data.documents ?? []);
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditId(null); setForm(EMPTY); setDialog(true); }

  function openEdit(d: LegalDoc) {
    setEditId(d.id);
    setForm({ title: d.title, slug: d.slug, content: d.content, isActive: d.isActive });
    setDialog(true);
  }

  async function handleSave() {
    if (!form.title || !form.content) { toast.error("Titulo y contenido son obligatorios"); return; }
    setSaving(true);
    try {
      const body: any = { ...form };
      if (editId) body.id = editId;

      const res = await fetch("/api/admin/legals", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { toast.success(editId ? "Documento actualizado" : "Documento creado"); setDialog(false); load(); }
      else { const d = await res.json(); toast.error(d.error || "Error"); }
    } catch { toast.error("Error de conexion"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/legals?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Documento eliminado"); load(); }
    } catch { toast.error("Error"); }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Legales</h1>
          <p className="text-sm text-muted-foreground">Administra los terminos y condiciones y documentos legales de la tienda.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="size-4" />Nuevo documento</Button>
      </div>

      {docs.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto size-12 text-muted-foreground/50 mb-3" />
          <p className="font-medium">No hay documentos legales cargados</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {docs.map((d) => (
            <Card key={d.id} className={`border-border shadow-sm ${!d.isActive ? "opacity-50" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{d.title}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">/{d.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.isActive ? <Badge variant="default">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}
                  <Button variant="ghost" size="icon" title="Imprimir" onClick={() => printDocument(d.title, d.content)}><Printer className="size-4" /></Button>
                  <Button variant="ghost" size="icon" title="Descargar" onClick={() => downloadDocument(d.title, d.content)}><Download className="size-4" /></Button>
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(d)}><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="icon" title="Eliminar" onClick={() => handleDelete(d.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{d.content.slice(0, 300)}...</p>
                <p className="text-xs text-muted-foreground mt-2">Ultima actualizacion: {new Date(d.updatedAt).toLocaleString("es-AR")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar documento legal" : "Nuevo documento legal"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Titulo <span className="text-destructive">*</span></Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Slug (URL)</Label><Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="Se genera automaticamente" className="font-mono" /></div>
            </div>
            <div className="space-y-2">
              <Label>Contenido <span className="text-destructive">*</span></Label>
              <Textarea rows={20} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">Podes usar formato Markdown (# titulo, ## subtitulo, - lista, **negrita**, etc.)</p>
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} /><Label>Activo (visible en la tienda)</Label></div>
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
