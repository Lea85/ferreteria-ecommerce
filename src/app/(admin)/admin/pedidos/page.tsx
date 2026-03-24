"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/utils";

type OrderApi = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  shippingMethod: string;
  paymentMethod: string;
  subtotal: number;
  total: number;
  createdAt: string;
  _count: { items: number };
};

type OrderRow = OrderApi;

const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "PENDING", label: "PENDING" },
  { value: "PAYMENT_PENDING", label: "PAYMENT_PENDING" },
  { value: "PAYMENT_APPROVED", label: "PAYMENT_APPROVED" },
  { value: "PREPARING", label: "PREPARING" },
  { value: "SHIPPED", label: "SHIPPED" },
  { value: "DELIVERED", label: "DELIVERED" },
  { value: "CANCELLED", label: "CANCELLED" },
] as const;

const LIMIT = 20;

function formatOrderDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminPedidosPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al cargar pedidos");
        setOrders([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setError("Error de red");
      setOrders([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const columns: DataTableColumn<OrderRow>[] = useMemo(
    () => [
      {
        id: "orderNumber",
        header: "Pedido#",
        accessor: "orderNumber",
        sortable: true,
        cell: (row) => (
          <Link
            href={`/admin/pedidos/${row.id}`}
            className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            {row.orderNumber}
          </Link>
        ),
      },
      {
        id: "client",
        header: "Cliente",
        accessor: "customerName",
        sortable: true,
        cell: (row) => (
          <div>
            <p className="font-medium">{row.customerName}</p>
            <p className="text-xs text-muted-foreground">{row.customerEmail}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: "Estado",
        accessor: "status",
        sortable: true,
        cell: (row) => <OrderStatusBadge status={row.status} />,
      },
      {
        id: "items",
        header: "Items",
        accessor: (row) => row._count.items,
        sortable: true,
        cell: (row) => row._count.items,
      },
      {
        id: "total",
        header: "Total",
        accessor: "total",
        sortable: true,
        cell: (row) => (
          <span className="font-semibold">{formatPrice(row.total)}</span>
        ),
      },
      {
        id: "createdAt",
        header: "Fecha",
        accessor: "createdAt",
        sortable: true,
        cell: (row) => (
          <span className="text-muted-foreground">{formatOrderDate(row.createdAt)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Gestión y seguimiento de todos los pedidos.
          </p>
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto bg-muted/50 p-1">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="shrink-0 text-xs sm:text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
          <Button variant="outline" size="sm" className="ml-3" onClick={() => void loadOrders()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={orders}
        searchPlaceholder="Buscar por número, cliente o email…"
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
      />
    </div>
  );
}
