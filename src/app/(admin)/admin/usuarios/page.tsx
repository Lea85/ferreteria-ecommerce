"use client";

import { CheckCircle2, Edit, Loader2, Tag, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import type { CustomerType } from "@/lib/constants";

type CustCategory = {
  id: string;
  name: string;
  benefitType: string;
  isActive: boolean;
};

type UserApi = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  customerType: CustomerType;
  role: string;
  isApproved: boolean;
  createdAt: string;
  _count: { orders: number; addresses: number };
  customerCategoryIds: string[];
};

type UserRow = UserApi;

const LIMIT = 20;

export default function AdminUsuariosPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    customerType: "CONSUMER" as CustomerType,
    isApproved: true,
  });
  const [editCategoryIds, setEditCategoryIds] = useState<Set<string>>(new Set());
  const [customerCategories, setCustomerCategories] = useState<CustCategory[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/customer-categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.categories) setCustomerCategories(d.categories);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al cargar usuarios");
        setUsers([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      toast.error("Error de red");
      setUsers([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, page]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditForm({
      name: user.name,
      lastName: user.lastName ?? "",
      email: user.email,
      phone: user.phone ?? "",
      customerType: user.customerType,
      isApproved: user.isApproved,
    });
    setEditCategoryIds(new Set(user.customerCategoryIds || []));
  }

  async function saveEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editUser.id,
          name: editForm.name.trim(),
          lastName: editForm.lastName.trim() || null,
          email: editForm.email.trim(),
          phone: editForm.phone.trim() || null,
          customerType: editForm.customerType,
          isApproved: editForm.isApproved,
          customerCategoryIds: Array.from(editCategoryIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      toast.success("Cliente actualizado");
      setEditUser(null);
      await loadUsers();
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isApproved: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo aprobar");
        return;
      }
      toast.success("Cuenta aprobada");
      await loadUsers();
    } catch {
      toast.error("Error de red");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(
        `/api/admin/users?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar");
        return;
      }
      toast.success("Usuario eliminado");
      if (editUser?.id === id) setEditUser(null);
      await loadUsers();
    } catch {
      toast.error("Error de red");
    }
  }

  const columns: DataTableColumn<UserRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Nombre",
        accessor: "name",
        sortable: true,
        cell: (row) => (
          <span className="font-medium">
            {row.name} {row.lastName ?? ""}
          </span>
        ),
      },
      {
        id: "email",
        header: "Email",
        accessor: "email",
        sortable: true,
      },
      {
        id: "type",
        header: "Tipo",
        accessor: "customerType",
        sortable: true,
        cell: (row) => (
          <Badge
            variant={
              row.customerType === "WHOLESALE"
                ? "default"
                : row.customerType === "TRADE"
                  ? "secondary"
                  : "outline"
            }
          >
            {CUSTOMER_TYPE_LABELS[row.customerType]}
          </Badge>
        ),
      },
      {
        id: "orders",
        header: "Pedidos",
        accessor: (row) => row._count.orders,
        sortable: true,
      },
      {
        id: "status",
        header: "Estado",
        accessor: "isApproved",
        sortable: true,
        cell: (row) =>
          row.isApproved ? (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle2 className="size-4" />
              Activo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-amber-600">
              <XCircle className="size-4" />
              Pendiente
            </span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de usuarios, aprobación y edición.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/admin/categorias-clientes">
              <Tag className="size-4" />
              Categorías de Clientes
            </Link>
          </Button>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="CONSUMER">Consumidor</SelectItem>
              <SelectItem value="TRADE">Gremio</SelectItem>
              <SelectItem value="WHOLESALE">Mayorista</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="Buscar por nombre o email…"
        externalSearch={{ value: searchInput, onChange: setSearchInput }}
        isLoading={loading}
        pagination={{
          page,
          pageSize: LIMIT,
          total,
          totalPages,
          fromServer: true,
          onPageChange: setPage,
        }}
        renderActions={(row) => (
          <div className="flex justify-end gap-1">
            {!row.isApproved ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                onClick={() => void handleApprove(row.id)}
              >
                <CheckCircle2 className="size-3.5" />
                Aprobar
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
              <Edit className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void handleDelete(row.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      <Dialog
        open={!!editUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de cliente</Label>
              <Select
                value={editForm.customerType}
                onValueChange={(v) =>
                  setEditForm((f) => ({
                    ...f,
                    customerType: v as CustomerType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSUMER">Consumidor</SelectItem>
                  <SelectItem value="TRADE">Gremio</SelectItem>
                  <SelectItem value="WHOLESALE">Mayorista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="approved-switch">Cuenta aprobada</Label>
                <p className="text-xs text-muted-foreground">
                  Los mayoristas y gremios pueden requerir aprobación.
                </p>
              </div>
              <Switch
                id="approved-switch"
                checked={editForm.isApproved}
                onCheckedChange={(v) =>
                  setEditForm((f) => ({ ...f, isApproved: v }))
                }
              />
            </div>
            {customerCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Categorías de cliente</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
                  {customerCategories
                    .filter((cc) => cc.isActive)
                    .map((cc) => (
                      <label key={cc.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={editCategoryIds.has(cc.id)}
                          onCheckedChange={(checked) => {
                            setEditCategoryIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(cc.id);
                              else next.delete(cc.id);
                              return next;
                            });
                          }}
                        />
                        <span>{cc.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({cc.benefitType === "DISCOUNT_PERCENT"
                            ? "% descuento"
                            : cc.benefitType === "DISCOUNT_AMOUNT"
                              ? "$ descuento"
                              : cc.benefitType === "VOLUME_DISCOUNT"
                                ? "Volumen"
                                : cc.benefitType === "FREE_SHIPPING"
                                  ? "Envío gratis"
                                  : cc.benefitType})
                        </span>
                      </label>
                    ))}
                  {customerCategories.filter((cc) => cc.isActive).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hay categorías activas. Crealas desde{" "}
                      <Link href="/admin/categorias-clientes" className="text-primary hover:underline">
                        Categorías de Clientes
                      </Link>.
                    </p>
                  )}
                </div>
              </div>
            )}

            {editUser ? (
              <p className="text-xs text-muted-foreground">
                Pedidos: {editUser._count.orders} · Direcciones:{" "}
                {editUser._count.addresses}
              </p>
            ) : null}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditUser(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={() => void saveEdit()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
