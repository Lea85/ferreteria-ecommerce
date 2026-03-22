"use client";

import { Ban, CheckCircle2, Edit, MapPin, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import type { CustomerType } from "@/lib/constants";

type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

type UserRow = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  customerType: CustomerType;
  role: string;
  isApproved: boolean;
  isBlocked: boolean;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
  addresses: Address[];
};

const MOCK_USERS: UserRow[] = [
  { id: "u1", name: "Admin", lastName: "FerroSan", email: "admin@ferrosan.com", phone: "", customerType: "CONSUMER", role: "ADMIN", isApproved: true, isBlocked: false, ordersCount: 0, totalSpent: 0, createdAt: "01 ene 2026", addresses: [] },
  { id: "u2", name: "Juan", lastName: "Perez", email: "juan@example.com", phone: "1155001234", customerType: "CONSUMER", role: "CUSTOMER", isApproved: true, isBlocked: false, ordersCount: 12, totalSpent: 485000, createdAt: "15 ene 2026", addresses: [{ id: "a1", label: "Casa", street: "Av. Rivadavia 1234", city: "CABA", state: "Buenos Aires", zip: "1406" }] },
  { id: "u3", name: "Carlos", lastName: "Rodriguez", email: "carlos.plomero@example.com", phone: "1144005678", customerType: "TRADE", role: "CUSTOMER", isApproved: true, isBlocked: false, ordersCount: 34, totalSpent: 2340000, createdAt: "20 ene 2026", addresses: [{ id: "a2", label: "Taller", street: "Calle 25 de Mayo 456", city: "Avellaneda", state: "Buenos Aires", zip: "1870" }] },
  { id: "u4", name: "Maria", lastName: "Gonzalez", email: "constructora@example.com", phone: "1133009876", customerType: "WHOLESALE", role: "CUSTOMER", isApproved: true, isBlocked: false, ordersCount: 8, totalSpent: 5680000, createdAt: "05 feb 2026", addresses: [] },
  { id: "u5", name: "Instalaciones", lastName: "Delta", email: "delta@empresa.com", phone: "1122004321", customerType: "TRADE", role: "CUSTOMER", isApproved: false, isBlocked: false, ordersCount: 0, totalSpent: 0, createdAt: "18 mar 2026", addresses: [] },
  { id: "u6", name: "Ana", lastName: "Lopez", email: "ana.lopez@email.com", phone: "", customerType: "CONSUMER", role: "CUSTOMER", isApproved: true, isBlocked: false, ordersCount: 3, totalSpent: 125000, createdAt: "10 feb 2026", addresses: [] },
  { id: "u7", name: "Ferreteria Amigo", lastName: "SRL", email: "amigo@ferreteria.com", phone: "1166001122", customerType: "WHOLESALE", role: "CUSTOMER", isApproved: true, isBlocked: false, ordersCount: 52, totalSpent: 12450000, createdAt: "01 feb 2026", addresses: [{ id: "a3", label: "Deposito", street: "Ruta 3 km 42", city: "La Matanza", state: "Buenos Aires", zip: "1752" }] },
  { id: "u8", name: "Pablo", lastName: "Sanchez", email: "pablo@hotmail.com", phone: "", customerType: "CONSUMER", role: "CUSTOMER", isApproved: true, isBlocked: true, ordersCount: 1, totalSpent: 34200, createdAt: "12 mar 2026", addresses: [] },
  { id: "u9", name: "Obra Norte", lastName: "SA", email: "obra@norte.com", phone: "1177002233", customerType: "WHOLESALE", role: "CUSTOMER", isApproved: false, isBlocked: false, ordersCount: 0, totalSpent: 0, createdAt: "19 mar 2026", addresses: [] },
  { id: "u10", name: "Gasista", lastName: "Norte", email: "gasista@norte.com", phone: "1188003344", customerType: "TRADE", role: "CUSTOMER", isApproved: true, isBlocked: false, ordersCount: 22, totalSpent: 1890000, createdAt: "28 ene 2026", addresses: [{ id: "a4", label: "Oficina", street: "San Martin 789", city: "San Isidro", state: "Buenos Aires", zip: "1642" }] },
];

export default function AdminUsuariosPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [users, setUsers] = useState(MOCK_USERS);
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", lastName: "", email: "", phone: "", customerType: "CONSUMER" as string });
  const [editAddresses, setEditAddresses] = useState<Address[]>([]);

  const filtered = users.filter((u) => {
    if (typeFilter !== "all" && u.customerType !== typeFilter) return false;
    if (approvalFilter === "pending" && u.isApproved) return false;
    if (approvalFilter === "approved" && !u.isApproved) return false;
    if (approvalFilter === "blocked" && !u.isBlocked) return false;
    return true;
  });

  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditForm({ name: user.name, lastName: user.lastName, email: user.email, phone: user.phone, customerType: user.customerType });
    setEditAddresses([...user.addresses]);
  }

  function saveEdit() {
    if (!editUser) return;
    setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...editForm, customerType: editForm.customerType as CustomerType, addresses: editAddresses } : u));
    setEditUser(null);
    toast.success("Cliente actualizado");
  }

  function handleBlock(id: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isBlocked: !u.isBlocked } : u));
    toast.success("Estado actualizado");
  }

  function handleDelete(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("Cliente eliminado");
  }

  function handleApprove(id: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isApproved: true } : u));
    toast.success("Cuenta aprobada");
  }

  function addAddress() {
    setEditAddresses((prev) => [...prev, { id: `new-${Date.now()}`, label: "", street: "", city: "", state: "", zip: "" }]);
  }

  function updateAddress(idx: number, field: keyof Address, value: string) {
    setEditAddresses((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  }

  function removeAddress(idx: number) {
    setEditAddresses((prev) => prev.filter((_, i) => i !== idx));
  }

  const columns: DataTableColumn<UserRow>[] = [
    { id: "name", header: "Nombre", accessor: "name", sortable: true, cell: (row) => (
      <div>
        <p className="font-medium">{row.name} {row.lastName}</p>
        <p className="text-xs text-muted-foreground">{row.email}</p>
      </div>
    )},
    { id: "type", header: "Tipo", accessor: "customerType", sortable: true, cell: (row) => (
      <Badge variant={row.customerType === "WHOLESALE" ? "default" : row.customerType === "TRADE" ? "secondary" : "outline"}>
        {CUSTOMER_TYPE_LABELS[row.customerType]}
      </Badge>
    )},
    { id: "role", header: "Rol", accessor: "role", sortable: true, cell: (row) => (
      row.role === "ADMIN" ? <Badge className="bg-violet-600"><ShieldCheck className="mr-1 size-3" />Admin</Badge> : <span className="text-muted-foreground text-sm">Cliente</span>
    )},
    { id: "status", header: "Estado", sortable: true, accessor: "isApproved", cell: (row) => (
      row.isBlocked
        ? <span className="flex items-center gap-1 text-sm text-red-600"><Ban className="size-4" />Bloqueado</span>
        : row.isApproved
        ? <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="size-4" />Activo</span>
        : <span className="flex items-center gap-1 text-sm text-amber-600"><XCircle className="size-4" />Pendiente</span>
    )},
    { id: "orders", header: "Pedidos", accessor: "ordersCount", sortable: true },
    { id: "spent", header: "Total", accessor: "totalSpent", sortable: true, cell: (row) => (
      <span className="font-medium">{row.totalSpent > 0 ? `$${(row.totalSpent / 1000).toFixed(0)}K` : "-"}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestion de usuarios, aprobacion y edicion.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 border-border"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="CONSUMER">Consumidor</SelectItem>
              <SelectItem value="TRADE">Gremio</SelectItem>
              <SelectItem value="WHOLESALE">Mayorista</SelectItem>
            </SelectContent>
          </Select>
          <Select value={approvalFilter} onValueChange={setApprovalFilter}>
            <SelectTrigger className="w-44 border-border"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Activos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Buscar por nombre o email..."
        searchKeys={["name", "lastName", "email"]}
        pagination={{ page, pageSize: 8, total: filtered.length, onPageChange: setPage }}
        renderActions={(row) => (
          <div className="flex justify-end gap-1">
            {!row.isApproved && (
              <Button size="sm" variant="outline" className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleApprove(row.id)}>
                <CheckCircle2 className="size-3.5" />Aprobar
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => openEdit(row)}><Edit className="size-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => handleBlock(row.id)}>
              <Ban className={`size-4 ${row.isBlocked ? "text-emerald-600" : "text-amber-600"}`} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de cliente</Label>
              <Select value={editForm.customerType} onValueChange={(v) => setEditForm((f) => ({ ...f, customerType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSUMER">Consumidor</SelectItem>
                  <SelectItem value="TRADE">Gremio</SelectItem>
                  <SelectItem value="WHOLESALE">Mayorista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><MapPin className="size-4" />Direcciones</Label>
                <Button type="button" size="sm" variant="outline" onClick={addAddress}>Agregar</Button>
              </div>
              {editAddresses.length === 0 && <p className="text-sm text-muted-foreground">Sin direcciones registradas.</p>}
              {editAddresses.map((addr, idx) => (
                <div key={addr.id} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <Input placeholder="Etiqueta (Casa, Trabajo...)" value={addr.label} onChange={(e) => updateAddress(idx, "label", e.target.value)} className="max-w-[200px]" />
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeAddress(idx)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                  <Input placeholder="Calle y numero" value={addr.street} onChange={(e) => updateAddress(idx, "street", e.target.value)} />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Ciudad" value={addr.city} onChange={(e) => updateAddress(idx, "city", e.target.value)} />
                    <Input placeholder="Provincia" value={addr.state} onChange={(e) => updateAddress(idx, "state", e.target.value)} />
                    <Input placeholder="CP" value={addr.zip} onChange={(e) => updateAddress(idx, "zip", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button onClick={saveEdit}>Guardar cambios</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
