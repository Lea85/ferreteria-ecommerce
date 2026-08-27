"use client";

import { CheckCircle2, Edit, Eye, Loader2, MessageCircle, Plus, Tag, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import {
  buildCustomerWhatsAppGreeting,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";

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

function formatCuit(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

function AdminUsuariosPageInner() {
  const searchParams = useSearchParams();
  const [typeFilter, setTypeFilter] = useState<string>(
    () => searchParams.get("type") ?? "all",
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    () => searchParams.get("approved") ?? "all",
  );
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
    role: "CUSTOMER",
    isApproved: true,
  });
  const [editCategoryIds, setEditCategoryIds] = useState<Set<string>>(new Set());
  const [customerCategories, setCustomerCategories] = useState<CustCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createCustomerType, setCreateCustomerType] = useState<"consumer" | "pro">(
    "consumer",
  );
  const [createCuit, setCreateCuit] = useState("");
  const [createNewsletter, setCreateNewsletter] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

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
  }, [debouncedSearch, typeFilter, statusFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("approved", statusFilter);
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
  }, [debouncedSearch, typeFilter, statusFilter, page]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;

    let cancelled = false;
    fetch(`/api/admin/users/${editId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data.user) {
          throw new Error(data.error || "No se pudo cargar el cliente");
        }
        if (cancelled) return;
        const u = data.user as {
          id: string;
          name: string;
          lastName: string | null;
          email: string;
          phone: string | null;
          customerType: CustomerType;
          role: string;
          isApproved: boolean;
          createdAt: string;
          customerCategories: { id: string }[];
          _count: { orders: number; addresses: number };
        };
        openEdit({
          id: u.id,
          name: u.name,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone,
          customerType: u.customerType,
          role: u.role,
          isApproved: u.isApproved,
          createdAt: u.createdAt,
          _count: {
            orders: u._count.orders,
            addresses: u._count.addresses,
          },
          customerCategoryIds: (u.customerCategories || []).map((c) => c.id),
        });
        window.history.replaceState(null, "", "/admin/usuarios");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "No se pudo abrir la edición",
          );
        }
      });

    return () => {
      cancelled = true;
    };
    // Solo reacciona al query edit=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditForm({
      name: user.name,
      lastName: user.lastName ?? "",
      email: user.email,
      phone: user.phone ?? "",
      customerType: user.customerType,
      role: user.role || "CUSTOMER",
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
          role: editForm.role,
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

  function openCreate() {
    setCreateCustomerType("consumer");
    setCreateCuit("");
    setCreateNewsletter(true);
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      lastName: String(formData.get("lastname") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      customerType: createCustomerType === "pro" ? "TRADE" : "CONSUMER",
      cuit: createCustomerType === "pro" ? createCuit : "",
      company:
        createCustomerType === "pro" ? String(formData.get("company") ?? "") : "",
      newsletterOptIn: createNewsletter,
    };

    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "No se pudo crear el cliente");
        return;
      }
      toast.success("Cliente creado");
      setCreateOpen(false);
      await loadUsers();
    } catch {
      setCreateError("Error de red");
    } finally {
      setCreating(false);
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
        id: "role",
        header: "Rol",
        accessor: "role",
        sortable: true,
        cell: (row) => {
          const labels: Record<string, string> = {
            CUSTOMER: "Cliente",
            MOSTRADOR: "Mostrador",
            ADMIN: "Admin",
            SUPER_ADMIN: "Super admin",
          };
          return (
            <Badge variant={row.role === "CUSTOMER" ? "outline" : "default"}>
              {labels[row.role] ?? row.role}
            </Badge>
          );
        },
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
          <Button
            type="button"
            size="sm"
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Nuevo cliente
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/admin/categorias-clientes">
              <Tag className="size-4" />
              Categorías de Clientes
            </Link>
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="false">Pendientes de aprobación</SelectItem>
              <SelectItem value="true">Aprobados</SelectItem>
            </SelectContent>
          </Select>
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
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={`/admin/usuarios/${row.id}`}
                aria-label="Ver detalle"
              >
                <Eye className="size-4" />
              </Link>
            </Button>
            {(() => {
              const waUrl = buildWhatsAppUrl(
                row.phone,
                buildCustomerWhatsAppGreeting(
                  [row.name, row.lastName].filter(Boolean).join(" "),
                ),
              );
              if (waUrl) {
                return (
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Enviar WhatsApp"
                      title={`WhatsApp: ${row.phone}`}
                    >
                      <MessageCircle className="size-4 text-emerald-600" />
                    </a>
                  </Button>
                );
              }
              return (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled
                  aria-label="Sin teléfono para WhatsApp"
                  title="Este cliente no tiene teléfono cargado"
                >
                  <MessageCircle className="size-4 text-muted-foreground" />
                </Button>
              );
            })()}
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
            <div className="space-y-2">
              <Label>Rol en la plataforma</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, role: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Cliente</SelectItem>
                  <SelectItem value="MOSTRADOR">Mostrador</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Administrador y mostrador habilitan venta mostrador y presupuestos.
                La usuaria debe cerrar sesión y volver a entrar para aplicar el cambio.
              </p>
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!creating) setCreateOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 pt-2" onSubmit={(e) => void handleCreate(e)}>
            {createError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {createError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <RequiredLabel htmlFor="create-name">Nombre</RequiredLabel>
                <Input id="create-name" name="name" required disabled={creating} />
              </div>
              <div className="space-y-2">
                <RequiredLabel htmlFor="create-lastname">Apellido</RequiredLabel>
                <Input
                  id="create-lastname"
                  name="lastname"
                  required
                  disabled={creating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <RequiredLabel htmlFor="create-email">Email</RequiredLabel>
              <Input
                id="create-email"
                name="email"
                type="email"
                required
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-phone">Teléfono</Label>
              <Input
                id="create-phone"
                name="phone"
                type="tel"
                disabled={creating}
              />
            </div>

            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Este cliente se crea sin contraseña: sirve para presupuestos y
              ventas. No podrá iniciar sesión en la tienda hasta que se le
              asigne una.
            </p>

            <div className="space-y-2">
              <RequiredLabel htmlFor="create-customerType">
                Tipo de cliente
              </RequiredLabel>
              <Select
                value={createCustomerType}
                onValueChange={(v) => setCreateCustomerType(v as "consumer" | "pro")}
                disabled={creating}
              >
                <SelectTrigger id="create-customerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consumer">Consumidor final</SelectItem>
                  <SelectItem value="pro">Soy profesional / gremio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createCustomerType === "pro" ? (
              <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
                <div className="space-y-2">
                  <RequiredLabel htmlFor="create-cuit">CUIT</RequiredLabel>
                  <Input
                    id="create-cuit"
                    name="cuit"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="20-12345678-3"
                    value={createCuit}
                    onChange={(e) => setCreateCuit(formatCuit(e.target.value))}
                    maxLength={13}
                    required
                    disabled={creating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: 2 dígitos - 8 dígitos - 1 dígito (ej: 20-12345678-3).
                  </p>
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="create-company">Razón social</RequiredLabel>
                  <Input
                    id="create-company"
                    name="company"
                    required
                    disabled={creating}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-3">
              <Checkbox
                id="create-newsletter"
                checked={createNewsletter}
                onCheckedChange={(checked) =>
                  setCreateNewsletter(checked === true)
                }
                disabled={creating}
              />
              <Label
                htmlFor="create-newsletter"
                className="cursor-pointer text-sm leading-snug"
              >
                Quiere recibir ofertas, novedades y tips por email (newsletter).
              </Label>
            </div>

            <p className="text-xs text-muted-foreground">
              El cliente queda aprobado y puede iniciar sesión con el email y la
              contraseña indicados. Los campos con{" "}
              <span className="text-destructive">*</span> son obligatorios.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creando…
                  </>
                ) : (
                  "Crear cliente"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminUsuariosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminUsuariosPageInner />
    </Suspense>
  );
}
