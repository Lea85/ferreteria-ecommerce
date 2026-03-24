"use client";

import { Edit, EyeOff, FolderTree, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CategoryFlat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  isActive: boolean;
  position: number;
  productCount: number;
};

type CategoryNode = CategoryFlat & { children: CategoryNode[] };

function buildTree(flat: CategoryFlat[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  for (const c of flat) {
    map.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sortRec(nodes: CategoryNode[]) {
    nodes.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    for (const n of nodes) sortRec(n.children);
  }
  sortRec(roots);
  return roots;
}

function collectDescendantIds(nodeId: string, flat: CategoryFlat[]): Set<string> {
  const byParent = new Map<string | null, string[]>();
  for (const c of flat) {
    const p = c.parentId;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(c.id);
  }
  const out = new Set<string>();
  const stack = [...(byParent.get(nodeId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    out.add(id);
    for (const ch of byParent.get(id) ?? []) stack.push(ch);
  }
  return out;
}

function flatOptionsFromTree(
  nodes: CategoryNode[],
  depth: number,
  exclude: Set<string>,
): { id: string; label: string }[] {
  const rows: { id: string; label: string }[] = [];
  for (const n of nodes) {
    if (!exclude.has(n.id)) {
      rows.push({
        id: n.id,
        label: `${"— ".repeat(depth)}${n.name}`,
      });
      rows.push(...flatOptionsFromTree(n.children, depth + 1, exclude));
    }
  }
  return rows;
}

export default function AdminCategoriasPage() {
  const [flat, setFlat] = useState<CategoryFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParent, setFormParent] = useState<string>("none");

  const tree = useMemo(() => buildTree(flat), [flat]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al cargar categorías");
        setFlat([]);
        return;
      }
      setFlat(data.categories ?? []);
    } catch {
      toast.error("Error de red");
      setFlat([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const parentExclude = useMemo(() => {
    if (!editingId) return new Set<string>();
    const ex = new Set<string>([editingId]);
    collectDescendantIds(editingId, flat).forEach((id) => ex.add(id));
    return ex;
  }, [editingId, flat]);

  const parentOptions = useMemo(
    () => flatOptionsFromTree(tree, 0, parentExclude),
    [tree, parentExclude],
  );

  function openNew() {
    setEditingId(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormParent("none");
    setDialogOpen(true);
  }

  function openEdit(cat: CategoryFlat) {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description ?? "");
    setFormParent(cat.parentId ?? "none");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const slug =
      (formSlug.trim() ||
        formName
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")) || "categoria";
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            name: formName.trim(),
            slug: slug.trim(),
            description: formDescription.trim() || null,
            parentId: formParent === "none" ? null : formParent,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "No se pudo actualizar");
          return;
        }
        toast.success("Categoría actualizada");
      } else {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            slug: slug.trim(),
            description: formDescription.trim() || null,
            parentId: formParent === "none" ? null : formParent,
            isActive: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "No se pudo crear");
          return;
        }
        toast.success("Categoría creada");
      }
      setDialogOpen(false);
      await loadCategories();
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar");
        return;
      }
      toast.success("Categoría eliminada");
      await loadCategories();
    } catch {
      toast.error("Error de red");
    }
  }

  async function toggleSuspend(cat: CategoryFlat, next: boolean) {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cat.id,
          isActive: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo actualizar");
        return;
      }
      toast.success(
        next
          ? "Categoría reactivada."
          : "Categoría suspendida. Los productos no serán visibles.",
      );
      await loadCategories();
    } catch {
      toast.error("Error de red");
    }
  }

  function CategoryChildren({
    nodes,
    depth,
  }: {
    nodes: CategoryNode[];
    depth: number;
  }) {
    if (nodes.length === 0) return null;
    return (
      <div className={cn("space-y-2", depth > 0 && "mt-2 border-l border-border pl-3")}>
        {nodes.map((child) => (
          <div key={child.id}>
            <div
              className={cn(
                "flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                !child.isActive && "border-dashed opacity-50",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded border-l-2 border-b-2 border-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium">{child.name}</p>
                  <p className="text-xs text-muted-foreground">/{child.slug}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!child.isActive ? (
                  <Badge variant="destructive" className="text-xs">
                    Suspendida
                  </Badge>
                ) : null}
                <Badge variant="outline" className="text-xs">
                  {child.productCount} prod.
                </Badge>
                <Switch
                  checked={child.isActive}
                  onCheckedChange={(v) => void toggleSuspend(child, v)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => openEdit(child)}
                >
                  <Edit className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => void handleDelete(child.id)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            <CategoryChildren nodes={child.children} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Organizá los productos en categorías. Podés suspender una categoría para ocultar sus productos.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="size-4" />
          Nueva categoría
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-10 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay categorías.</p>
          ) : (
            tree.map((root) => (
              <Card
                key={root.id}
                className={cn(
                  "border-border shadow-sm",
                  !root.isActive && "border-dashed opacity-50",
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg",
                        root.isActive ? "bg-primary/10" : "bg-destructive/10",
                      )}
                    >
                      {root.isActive ? (
                        <FolderTree className="size-5 text-primary" />
                      ) : (
                        <EyeOff className="size-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{root.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">/{root.slug}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!root.isActive ? (
                      <Badge variant="destructive" className="text-xs">
                        Suspendida
                      </Badge>
                    ) : null}
                    <Badge variant="secondary">{root.productCount} prod.</Badge>
                    <div
                      className="ml-1 flex items-center gap-1 border-l border-border pl-2"
                      title={root.isActive ? "Suspender" : "Reactivar"}
                    >
                      <Switch
                        checked={root.isActive}
                        onCheckedChange={(v) => void toggleSuspend(root, v)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(root)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void handleDelete(root.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                {root.children.length > 0 ? (
                  <CardContent className="pt-0">
                    <Separator className="mb-3" />
                    <CategoryChildren nodes={root.children} depth={0} />
                  </CardContent>
                ) : null}
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Herramientas eléctricas"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="Se genera automáticamente"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Opcional"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría padre</Label>
              <Select value={formParent} onValueChange={setFormParent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">Ninguna (raíz)</SelectItem>
                  {parentOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando…
                  </>
                ) : editingId ? (
                  "Guardar"
                ) : (
                  "Crear"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
