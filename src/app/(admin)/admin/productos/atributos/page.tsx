"use client";

import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AttrValue = { id: string; value: string; position: number };
type Attribute = {
  id: string;
  name: string;
  position: number;
  values: AttrValue[];
};

export default function AtributosPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);

  const [attrDialog, setAttrDialog] = useState(false);
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null);
  const [attrName, setAttrName] = useState("");

  const [valueDialog, setValueDialog] = useState(false);
  const [valueAttrId, setValueAttrId] = useState<string | null>(null);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [valueName, setValueName] = useState("");

  const [saving, setSaving] = useState(false);

  const fetchAttributes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/product-attributes");
      const data = await res.json();
      setAttributes(data.attributes || []);
    } catch {
      toast.error("Error al cargar atributos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  async function apiPost(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/product-attributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error");
    return data;
  }

  function openCreateAttr() {
    setEditingAttrId(null);
    setAttrName("");
    setAttrDialog(true);
  }

  function openEditAttr(attr: Attribute) {
    setEditingAttrId(attr.id);
    setAttrName(attr.name);
    setAttrDialog(true);
  }

  async function saveAttr() {
    if (!attrName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (editingAttrId) {
        await apiPost({ action: "updateAttribute", id: editingAttrId, name: attrName });
        toast.success("Atributo actualizado");
      } else {
        await apiPost({ action: "createAttribute", name: attrName });
        toast.success("Atributo creado");
      }
      setAttrDialog(false);
      fetchAttributes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAttr(id: string) {
    if (!confirm("¿Eliminar este atributo y todos sus valores?")) return;
    try {
      await apiPost({ action: "deleteAttribute", id });
      toast.success("Atributo eliminado");
      fetchAttributes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  function openAddValue(attrId: string) {
    setValueAttrId(attrId);
    setEditingValueId(null);
    setValueName("");
    setValueDialog(true);
  }

  function openEditValue(attrId: string, val: AttrValue) {
    setValueAttrId(attrId);
    setEditingValueId(val.id);
    setValueName(val.value);
    setValueDialog(true);
  }

  async function saveValue() {
    if (!valueName.trim()) {
      toast.error("El valor es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (editingValueId) {
        await apiPost({ action: "updateValue", id: editingValueId, value: valueName });
        toast.success("Valor actualizado");
      } else {
        await apiPost({ action: "addValue", attributeId: valueAttrId, value: valueName });
        toast.success("Valor agregado");
      }
      setValueDialog(false);
      fetchAttributes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteValue(id: string) {
    if (!confirm("¿Eliminar este valor?")) return;
    try {
      await apiPost({ action: "deleteValue", id });
      toast.success("Valor eliminado");
      fetchAttributes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Administrar Sub Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Definí los atributos (ej: Color, Tamaño, Ángulo, Diámetro) y sus valores posibles.
            Luego al crear o editar un producto podés combinarlos para generar variantes.
          </p>
        </div>
        <Button onClick={openCreateAttr}>
          <Plus className="mr-2 size-4" /> Nuevo atributo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : attributes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-semibold">No hay atributos definidos</p>
          <p className="mt-2 text-sm">
            Creá atributos como &quot;Color&quot;, &quot;Diámetro&quot;, &quot;Ángulo&quot; para
            poder generar sub-variantes de productos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {attributes.map((attr) => (
            <Card key={attr.id} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{attr.name}</CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEditAttr(attr)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteAttr(attr.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {attr.values.map((v) => (
                    <Badge
                      key={v.id}
                      variant="secondary"
                      className="cursor-pointer gap-1 pr-1 text-sm"
                    >
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => openEditValue(attr.id, v)}
                      >
                        {v.value}
                      </span>
                      <button
                        type="button"
                        className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                        onClick={() => deleteValue(v.id)}
                      >
                        <X className="size-3 text-destructive" />
                      </button>
                    </Badge>
                  ))}
                  {attr.values.length === 0 && (
                    <span className="text-xs text-muted-foreground">Sin valores</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1"
                  onClick={() => openAddValue(attr.id)}
                >
                  <Plus className="size-3" /> Agregar valor
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={attrDialog} onOpenChange={setAttrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingAttrId ? "Editar atributo" : "Nuevo atributo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Nombre del atributo</Label>
            <Input
              placeholder="Ej: Color, Diámetro, Ángulo, Potencia..."
              value={attrName}
              onChange={(e) => setAttrName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveAttr()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttrDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAttr} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingAttrId ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={valueDialog} onOpenChange={setValueDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingValueId ? "Editar valor" : "Agregar valor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Valor</Label>
            <Input
              placeholder="Ej: Rojo, 20mm, 90°, 1300W..."
              value={valueName}
              onChange={(e) => setValueName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveValue()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveValue} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingValueId ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
