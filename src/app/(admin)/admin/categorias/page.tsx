"use client";

import { Edit, EyeOff, FolderTree, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  productCount: number;
  isActive: boolean;
};

const INITIAL_CATEGORIES: Category[] = [
  { id: "c1", name: "Sanitarios y Bano", slug: "sanitarios", parentId: null, position: 1, productCount: 12, isActive: true },
  { id: "c2", name: "Griferias", slug: "griferias", parentId: "c1", position: 1, productCount: 8, isActive: true },
  { id: "c3", name: "Inodoros y Depositos", slug: "inodoros", parentId: "c1", position: 2, productCount: 6, isActive: true },
  { id: "c4", name: "Vanitorys", slug: "vanitorys", parentId: "c1", position: 3, productCount: 4, isActive: true },
  { id: "c5", name: "Herramientas", slug: "herramientas", parentId: null, position: 2, productCount: 45, isActive: true },
  { id: "c6", name: "Manuales", slug: "herramientas-manuales", parentId: "c5", position: 1, productCount: 15, isActive: true },
  { id: "c7", name: "Soldadoras", slug: "soldadoras", parentId: "c5", position: 2, productCount: 5, isActive: true },
  { id: "c8", name: "Herramientas Electricas", slug: "herramientas-electricas", parentId: "c5", position: 3, productCount: 12, isActive: true },
  { id: "c9", name: "Herramientas a Bateria", slug: "herramientas-bateria", parentId: "c5", position: 4, productCount: 4, isActive: true },
  { id: "c10", name: "Compresores", slug: "compresores", parentId: "c5", position: 5, productCount: 3, isActive: true },
  { id: "c11", name: "Plomeria", slug: "plomeria", parentId: null, position: 3, productCount: 18, isActive: true },
  { id: "c12", name: "Canos PVC", slug: "canos-pvc", parentId: "c11", position: 1, productCount: 10, isActive: true },
  { id: "c13", name: "Pintureria", slug: "pintureria", parentId: null, position: 4, productCount: 8, isActive: true },
  { id: "c14", name: "Generadores", slug: "generadores", parentId: "c5", position: 6, productCount: 2, isActive: true },
  { id: "c15", name: "Hidrolavadoras", slug: "hidrolavadoras", parentId: "c5", position: 7, productCount: 2, isActive: true },
  { id: "c16", name: "Motobombas", slug: "motobombas", parentId: "c5", position: 8, productCount: 1, isActive: true },
  { id: "c17", name: "Taller y Automotor", slug: "taller-automotor", parentId: "c5", position: 9, productCount: 1, isActive: true },
];

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formParent, setFormParent] = useState<string>("none");

  const roots = categories.filter((c) => !c.parentId).sort((a, b) => a.position - b.position);

  function getChildren(parentId: string) {
    return categories.filter((c) => c.parentId === parentId).sort((a, b) => a.position - b.position);
  }

  function openNew() {
    setEditingId(null); setFormName(""); setFormSlug(""); setFormParent("none"); setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id); setFormName(cat.name); setFormSlug(cat.slug); setFormParent(cat.parentId ?? "none"); setDialogOpen(true);
  }

  function handleSave() {
    if (!formName.trim()) return;
    const slug = formSlug || formName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (editingId) {
      setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, name: formName, slug, parentId: formParent === "none" ? null : formParent } : c));
      toast.success("Categoria actualizada");
    } else {
      setCategories((prev) => [...prev, { id: `c${Date.now()}`, name: formName, slug, parentId: formParent === "none" ? null : formParent, position: categories.length + 1, productCount: 0, isActive: true }]);
      toast.success("Categoria creada");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    if (getChildren(id).length > 0) { toast.error("No se puede eliminar una categoria con subcategorias"); return; }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success("Categoria eliminada");
  }

  function toggleSuspend(id: string) {
    setCategories((prev) => prev.map((c) => {
      if (c.id === id) return { ...c, isActive: !c.isActive };
      if (c.parentId === id) return { ...c, isActive: !prev.find((p) => p.id === id)!.isActive ? false : c.isActive };
      return c;
    }));
    const cat = categories.find((c) => c.id === id);
    toast.success(cat?.isActive ? "Categoria suspendida. Los productos no seran visibles." : "Categoria reactivada.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground">Organiza los productos en categorias. Podes suspender una categoria para ocultar sus productos.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="size-4" />Nueva categoria</Button>
      </div>

      <div className="space-y-4">
        {roots.map((root) => {
          const children = getChildren(root.id);
          return (
            <Card key={root.id} className={cn("border-border shadow-sm", !root.isActive && "opacity-50 border-dashed")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", root.isActive ? "bg-primary/10" : "bg-destructive/10")}>
                    {root.isActive ? <FolderTree className="size-5 text-primary" /> : <EyeOff className="size-5 text-destructive" />}
                  </div>
                  <div>
                    <CardTitle className="text-base">{root.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">/{root.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!root.isActive && <Badge variant="destructive" className="text-xs">Suspendida</Badge>}
                  <Badge variant="secondary">{root.productCount} prod.</Badge>
                  <div className="flex items-center gap-1 border-l border-border pl-2 ml-1" title={root.isActive ? "Suspender" : "Reactivar"}>
                    <Switch checked={root.isActive} onCheckedChange={() => toggleSuspend(root.id)} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(root)}><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(root.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              {children.length > 0 && (
                <CardContent className="pt-0">
                  <Separator className="mb-3" />
                  <div className="space-y-2">
                    {children.map((child) => (
                      <div key={child.id} className={cn("flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-2.5", !child.isActive && "opacity-50 border-dashed")}>
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded border-l-2 border-b-2 border-muted-foreground/30" />
                          <div>
                            <p className="text-sm font-medium">{child.name}</p>
                            <p className="text-xs text-muted-foreground">/{child.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!child.isActive && <Badge variant="destructive" className="text-xs">Suspendida</Badge>}
                          <Badge variant="outline" className="text-xs">{child.productCount}</Badge>
                          <Switch checked={child.isActive} onCheckedChange={() => toggleSuspend(child.id)} />
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(child)}><Edit className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDelete(child.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar categoria" : "Nueva categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Nombre</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Herramientas Electricas" /></div>
            <div className="space-y-2"><Label>Slug (URL)</Label><Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="Se genera automaticamente" /></div>
            <div className="space-y-2">
              <Label>Categoria padre</Label>
              <Select value={formParent} onValueChange={setFormParent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna (raiz)</SelectItem>
                  {roots.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editingId ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
