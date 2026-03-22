"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";

type OrderRow = {
  id: string;
  number: string;
  client: string;
  email: string;
  date: string;
  status: string;
  items: number;
  total: number;
  paymentMethod: string;
};

const MOCK_ORDERS: OrderRow[] = [
  { id: "1", number: "FER-2026-001842", client: "Instalaciones Delta SRL", email: "delta@empresa.com", date: "18 mar 2026", status: "PREPARING", items: 5, total: 428950, paymentMethod: "Transferencia" },
  { id: "2", number: "FER-2026-001841", client: "María González", email: "maria@gmail.com", date: "18 mar 2026", status: "PAYMENT_APPROVED", items: 2, total: 67200, paymentMethod: "Mercado Pago" },
  { id: "3", number: "FER-2026-001840", client: "Gasista Norte", email: "gasista@norte.com", date: "17 mar 2026", status: "SHIPPED", items: 12, total: 312400, paymentMethod: "Transferencia" },
  { id: "4", number: "FER-2026-001839", client: "Constructora Sur SA", email: "compras@sur.com", date: "17 mar 2026", status: "DELIVERED", items: 28, total: 1245000, paymentMethod: "Transferencia" },
  { id: "5", number: "FER-2026-001838", client: "Juan Pérez", email: "juan@example.com", date: "16 mar 2026", status: "PAYMENT_PENDING", items: 1, total: 89500, paymentMethod: "Mercado Pago" },
  { id: "6", number: "FER-2026-001837", client: "Carlos Rodríguez", email: "carlos.plomero@example.com", date: "16 mar 2026", status: "PENDING", items: 3, total: 156000, paymentMethod: "Transferencia" },
  { id: "7", number: "FER-2026-001836", client: "Ferretería Amigo SRL", email: "amigo@ferreteria.com", date: "15 mar 2026", status: "DELIVERED", items: 45, total: 2340000, paymentMethod: "Transferencia" },
  { id: "8", number: "FER-2026-001835", client: "Ana López", email: "ana.lopez@email.com", date: "15 mar 2026", status: "CANCELLED", items: 1, total: 48500, paymentMethod: "Mercado Pago" },
  { id: "9", number: "FER-2026-001834", client: "Obra Norte SA", email: "obra@norte.com", date: "14 mar 2026", status: "DELIVERED", items: 18, total: 875000, paymentMethod: "Transferencia" },
  { id: "10", number: "FER-2026-001833", client: "Pablo Sánchez", email: "pablo@hotmail.com", date: "14 mar 2026", status: "REFUNDED", items: 2, total: 34200, paymentMethod: "Mercado Pago" },
];

export default function AdminPedidosPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = statusFilter === "all"
    ? MOCK_ORDERS
    : MOCK_ORDERS.filter((o) => o.status === statusFilter);

  const columns: DataTableColumn<OrderRow>[] = [
    { id: "number", header: "Pedido", accessor: "number", sortable: true, cell: (row) => <span className="font-mono text-xs font-semibold text-primary">{row.number}</span> },
    { id: "client", header: "Cliente", accessor: "client", sortable: true },
    { id: "date", header: "Fecha", accessor: "date", sortable: true, cell: (row) => <span className="text-muted-foreground">{row.date}</span> },
    { id: "status", header: "Estado", sortable: true, accessor: "status", cell: (row) => <OrderStatusBadge status={row.status} /> },
    { id: "items", header: "Items", accessor: "items", sortable: true },
    { id: "total", header: "Total", accessor: "total", sortable: true, cell: (row) => <span className="font-semibold">{formatPrice(row.total)}</span> },
    { id: "payment", header: "Pago", accessor: "paymentMethod", sortable: true, cell: (row) => <Badge variant="outline" className="text-xs">{row.paymentMethod}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Gestión y seguimiento de todos los pedidos.
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="PAYMENT_PENDING">Pago pendiente</SelectItem>
              <SelectItem value="PAYMENT_APPROVED">Pago aprobado</SelectItem>
              <SelectItem value="PREPARING">En preparación</SelectItem>
              <SelectItem value="SHIPPED">Despachado</SelectItem>
              <SelectItem value="DELIVERED">Entregado</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
              <SelectItem value="REFUNDED">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Buscar por número, cliente o email…"
        searchKeys={["number", "client", "email"]}
        pagination={{ page, pageSize: 8, total: filtered.length, onPageChange: setPage }}
        renderActions={(row) => (
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/pedidos/${row.id}`} aria-label="Ver detalle">
              <Eye className="size-4" />
            </Link>
          </Button>
        )}
      />
    </div>
  );
}
