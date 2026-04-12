"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/utils";
import { Eye } from "lucide-react";

type QuoteApi = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  total: number;
  itemCount: number;
  validUntil: string;
  createdAt: string;
};

const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "ACTIVE", label: "Activos" },
  { value: "EXPIRED", label: "Vencidos" },
  { value: "SOLD", label: "Vendidos" },
  { value: "CANCELLED", label: "Cancelados" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "default",
  EXPIRED: "secondary",
  SOLD: "outline",
  CANCELLED: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  EXPIRED: "Vencido",
  SOLD: "Vendido",
  CANCELLED: "Cancelado",
};

const LIMIT = 20;

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminPresupuestosPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [quotes, setQuotes] = useState<QuoteApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      const res = await fetch(`/api/admin/quotes?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setQuotes([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }
      setQuotes(data.quotes ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setQuotes([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  const columns: DataTableColumn<QuoteApi>[] = useMemo(
    () => [
      {
        id: "quoteNumber",
        header: "Presupuesto#",
        accessor: "quoteNumber",
        sortable: true,
        cell: (row) => (
          <Link
            href={`/admin/presupuestos/${row.id}`}
            className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            {row.quoteNumber}
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
        cell: (row) => (
          <Badge variant={STATUS_COLORS[row.status] as any}>
            {STATUS_LABELS[row.status] || row.status}
          </Badge>
        ),
      },
      {
        id: "items",
        header: "Items",
        accessor: "itemCount",
        sortable: true,
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
        id: "validUntil",
        header: "Válido hasta",
        accessor: "validUntil",
        sortable: true,
        cell: (row) => {
          const isExpired = new Date(row.validUntil) < new Date();
          return (
            <span className={isExpired ? "text-destructive" : "text-muted-foreground"}>
              {formatDate(row.validUntil)}
            </span>
          );
        },
      },
      {
        id: "createdAt",
        header: "Fecha",
        accessor: "createdAt",
        sortable: true,
        cell: (row) => (
          <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de presupuestos generados por clientes.
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

      <DataTable
        columns={columns}
        data={quotes}
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
        renderActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/admin/presupuestos/${row.id}`} aria-label="Ver detalle">
                <Eye className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      />
    </div>
  );
}
