"use client";

import { CheckCircle2, Eye, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import type { CustomerType } from "@/lib/constants";

type UserRow = {
  id: string;
  name: string;
  email: string;
  customerType: CustomerType;
  role: string;
  isApproved: boolean;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
};

const MOCK_USERS: UserRow[] = [
  { id: "u1", name: "Admin FerroSan", email: "admin@ferrosan.com", customerType: "CONSUMER", role: "ADMIN", isApproved: true, ordersCount: 0, totalSpent: 0, createdAt: "01 ene 2026" },
  { id: "u2", name: "Juan Pérez", email: "juan@example.com", customerType: "CONSUMER", role: "CUSTOMER", isApproved: true, ordersCount: 12, totalSpent: 485000, createdAt: "15 ene 2026" },
  { id: "u3", name: "Carlos Rodríguez", email: "carlos.plomero@example.com", customerType: "TRADE", role: "CUSTOMER", isApproved: true, ordersCount: 34, totalSpent: 2340000, createdAt: "20 ene 2026" },
  { id: "u4", name: "María González", email: "constructora@example.com", customerType: "WHOLESALE", role: "CUSTOMER", isApproved: true, ordersCount: 8, totalSpent: 5680000, createdAt: "05 feb 2026" },
  { id: "u5", name: "Instalaciones Delta", email: "delta@empresa.com", customerType: "TRADE", role: "CUSTOMER", isApproved: false, ordersCount: 0, totalSpent: 0, createdAt: "18 mar 2026" },
  { id: "u6", name: "Ana López", email: "ana.lopez@email.com", customerType: "CONSUMER", role: "CUSTOMER", isApproved: true, ordersCount: 3, totalSpent: 125000, createdAt: "10 feb 2026" },
  { id: "u7", name: "Ferretería Amigo SRL", email: "amigo@ferreteria.com", customerType: "WHOLESALE", role: "CUSTOMER", isApproved: true, ordersCount: 52, totalSpent: 12450000, createdAt: "01 feb 2026" },
  { id: "u8", name: "Pablo Sánchez", email: "pablo@hotmail.com", customerType: "CONSUMER", role: "CUSTOMER", isApproved: true, ordersCount: 1, totalSpent: 34200, createdAt: "12 mar 2026" },
  { id: "u9", name: "Obra Norte SA", email: "obra@norte.com", customerType: "WHOLESALE", role: "CUSTOMER", isApproved: false, ordersCount: 0, totalSpent: 0, createdAt: "19 mar 2026" },
  { id: "u10", name: "Gasista Norte", email: "gasista@norte.com", customerType: "TRADE", role: "CUSTOMER", isApproved: true, ordersCount: 22, totalSpent: 1890000, createdAt: "28 ene 2026" },
];

export default function AdminUsuariosPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [users, setUsers] = useState(MOCK_USERS);
  const [page, setPage] = useState(1);

  const filtered = users.filter((u) => {
    if (typeFilter !== "all" && u.customerType !== typeFilter) return false;
    if (approvalFilter === "pending" && u.isApproved) return false;
    if (approvalFilter === "approved" && !u.isApproved) return false;
    return true;
  });

  function handleApprove(id: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isApproved: true } : u));
    toast.success("Cuenta aprobada");
  }

  function handleReject(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("Cuenta rechazada y eliminada");
  }

  const columns: DataTableColumn<UserRow>[] = [
    { id: "name", header: "Nombre", accessor: "name", sortable: true, cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
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
    { id: "approved", header: "Estado", accessor: "isApproved", sortable: true, cell: (row) => (
      row.isApproved
        ? <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="size-4" />Aprobado</span>
        : <span className="flex items-center gap-1 text-sm text-amber-600"><XCircle className="size-4" />Pendiente</span>
    )},
    { id: "orders", header: "Pedidos", accessor: "ordersCount", sortable: true },
    { id: "spent", header: "Total comprado", accessor: "totalSpent", sortable: true, cell: (row) => (
      <span className="font-medium">{row.totalSpent > 0 ? `$${(row.totalSpent / 1000).toFixed(0)}K` : "—"}</span>
    )},
    { id: "created", header: "Registro", accessor: "createdAt", sortable: true, cell: (row) => <span className="text-sm text-muted-foreground">{row.createdAt}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de usuarios y aprobación de cuentas profesionales.
          </p>
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
            <SelectTrigger className="w-44 border-border"><SelectValue placeholder="Aprobación" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Buscar por nombre o email…"
        searchKeys={["name", "email"]}
        pagination={{ page, pageSize: 8, total: filtered.length, onPageChange: setPage }}
        renderActions={(row) => (
          <div className="flex justify-end gap-1">
            {!row.isApproved && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleApprove(row.id)}>
                  <CheckCircle2 className="size-3.5" />Aprobar
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleReject(row.id)}>
                  <XCircle className="size-3.5" />Rechazar
                </Button>
              </>
            )}
          </div>
        )}
      />
    </div>
  );
}
