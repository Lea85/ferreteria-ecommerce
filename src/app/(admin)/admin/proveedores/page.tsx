"use client";

import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
  isActive: boolean;
  _count: { products: number };
};

const emptyForm = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  taxId: "",
  notes: "",
  isActive: true,
};

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/suppliers?${params}`);
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setTotalPages(data.totalPages || 0);
      setTotal(data.total || 0);
    } catch {
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      contactName: s.contactName || "",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      taxId: s.taxId || "",
      notes: s.notes || "",
      isActive: s.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const payload = editingId ? { id: editingId, ...form } : form;
      const res = await fetch("/api/admin/suppliers", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      toast.success(editingId ? "Proveedor actualizado" : "Proveedor creado");
      setDialogOpen(false);
      fetchSuppliers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este proveedor?")) return;
    try {
      const res = await fetch(`/api/admin/suppliers?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Proveedor eliminado");
      fetchSuppliers();
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function toggleActive(s: Supplier) {
    try {
      await fetch("/api/admin/suppliers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, isActive: !s.isActive }),
      });
      fetchSuppliers();
    } catch {
      toast.error("Error al cambiar estado");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">{total} proveedores registrados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" /> Nuevo proveedor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email, CUIT..."
          className="pl-10"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No se encontraron proveedores
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead className="text-center">Productos</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contactName || "-"}</TableCell>
                    <TableCell>{s.email || "-"}</TableCell>
                    <TableCell>{s.phone || "-"}</TableCell>
                    <TableCell>{s.taxId || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{s._count.products}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={s.isActive} onCheckedChange={() => toggleActive(s)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Contacto</Label>
                <Input
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>CUIT</Label>
                <Input
                  value={form.taxId}
                  onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingId ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
