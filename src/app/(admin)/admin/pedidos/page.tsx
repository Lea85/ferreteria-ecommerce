"use client";

import * as XLSX from "xlsx";
import { Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  appendAdminOrdersNavParams,
  buildAdminOrdersListPath,
  parseAdminOrdersListSearchParams,
} from "@/lib/admin-orders-list-url";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/constants";
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

const SHIPPING_LABELS: Record<string, string> = {
  STORE_PICKUP: "Retiro en sucursal",
  OWN_DELIVERY: "Envío propio",
  CARRIER: "Correo / transporte",
};

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

function formatOrderDateExcel(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function buildQueryParams(opts: {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  sku?: string;
  page?: number;
  exportMode?: boolean;
}) {
  const params = new URLSearchParams();
  if (opts.search) params.set("search", opts.search);
  if (opts.status !== "all") params.set("status", opts.status);
  if (opts.dateFrom) params.set("dateFrom", opts.dateFrom);
  if (opts.dateTo) params.set("dateTo", opts.dateTo);
  if (opts.sku?.trim()) params.set("sku", opts.sku.trim());
  if (opts.exportMode) {
    params.set("export", "1");
  } else {
    params.set("page", String(opts.page ?? 1));
    params.set("limit", String(LIMIT));
  }
  return params;
}

function AdminPedidosPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialList = useMemo(
    () => parseAdminOrdersListSearchParams(searchParams),
    [searchParams],
  );

  const [statusFilter, setStatusFilter] = useState<string>(
    initialList.status ?? "all",
  );
  const [dateFrom, setDateFrom] = useState(initialList.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialList.dateTo ?? "");
  const [page, setPage] = useState(initialList.page ?? 1);
  const [searchInput, setSearchInput] = useState(initialList.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    initialList.search ?? "",
  );
  const [skuInput, setSkuInput] = useState(initialList.sku ?? "");
  const [debouncedSku, setDebouncedSku] = useState(initialList.sku ?? "");
  const skipFilterPageReset = useRef(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSku(skuInput.trim()), 300);
    return () => clearTimeout(t);
  }, [skuInput]);

  useEffect(() => {
    if (skipFilterPageReset.current) {
      skipFilterPageReset.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch, debouncedSku, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const next = buildAdminOrdersListPath({
      search: debouncedSearch,
      page,
      status: statusFilter,
      dateFrom,
      dateTo,
      sku: debouncedSku,
    });
    const current = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [
    debouncedSearch,
    debouncedSku,
    page,
    statusFilter,
    dateFrom,
    dateTo,
    pathname,
    router,
    searchParams,
  ]);

  const listReturnTo = useMemo(
    () =>
      buildAdminOrdersListPath({
        search: debouncedSearch,
        page,
        status: statusFilter,
        dateFrom,
        dateTo,
        sku: debouncedSku,
      }),
    [debouncedSearch, debouncedSku, page, statusFilter, dateFrom, dateTo],
  );

  const loadOrders = useCallback(async () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      setOrders([]);
      setTotal(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = buildQueryParams({
        search: debouncedSearch,
        status: statusFilter,
        dateFrom,
        dateTo,
        sku: debouncedSku,
        page,
      });
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al cargar ventas");
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
  }, [debouncedSearch, debouncedSku, statusFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function handleExportExcel() {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast.error("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }

    setExporting(true);
    try {
      const params = buildQueryParams({
        search: debouncedSearch,
        status: statusFilter,
        dateFrom,
        dateTo,
        sku: debouncedSku,
        exportMode: true,
      });
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo exportar");
        return;
      }

      const rows = (data.orders as OrderRow[]).map((o) => ({
        "N° venta": o.orderNumber,
        Fecha: formatOrderDateExcel(o.createdAt),
        Cliente: o.customerName || "",
        Email: o.customerEmail || "",
        Estado:
          ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status,
        "Medio de pago":
          PAYMENT_METHOD_LABELS[o.paymentMethod as PaymentMethod] ??
          o.paymentMethod,
        Envío: SHIPPING_LABELS[o.shippingMethod] ?? o.shippingMethod,
        Ítems: o._count.items,
        Subtotal: o.subtotal,
        Total: o.total,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ventas");
      const suffix = [dateFrom, dateTo, debouncedSku].filter(Boolean).join("_") || "todas";
      XLSX.writeFile(wb, `ventas_${suffix}.xlsx`);
      toast.success(`${rows.length} ventas exportadas`);
    } catch {
      toast.error("Error al generar el Excel");
    } finally {
      setExporting(false);
    }
  }

  const columns: DataTableColumn<OrderRow>[] = useMemo(
    () => [
      {
        id: "orderNumber",
        header: "Venta#",
        accessor: "orderNumber",
        sortable: true,
        cell: (row) => (
          <Link
            href={appendAdminOrdersNavParams(`/admin/pedidos/${row.id}`, {
              returnTo: listReturnTo,
            })}
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
    [listReturnTo],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Ventas</h1>
            <p className="text-sm text-muted-foreground">
              Gestión y seguimiento de ventas del sitio y del mostrador.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2 shrink-0"
            onClick={() => void handleExportExcel()}
            disabled={exporting || loading}
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Descargar Excel
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">
              Fecha desde
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full min-w-[160px] border-border sm:w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">
              Fecha hasta
            </Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full min-w-[160px] border-border sm:w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-ean" className="text-xs text-muted-foreground">
              SKU o EAN
            </Label>
            <Input
              id="sku-ean"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              placeholder="Ej: 7790… o SKU-123"
              className="w-full min-w-[180px] border-border font-mono sm:w-56"
              autoComplete="off"
            />
          </div>
          {(dateFrom || dateTo || skuInput) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setSkuInput("");
              }}
            >
              Limpiar filtros
            </Button>
          )}
          <p className="text-xs text-muted-foreground sm:ml-auto sm:pb-2">
            {debouncedSku
              ? `Ventas que incluyen el producto ${debouncedSku}.`
              : dateFrom || dateTo
                ? "Solo ventas dentro del rango seleccionado."
                : "Podés filtrar por fechas y/o por SKU o EAN vendido."}
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

export default function AdminPedidosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminPedidosPageInner />
    </Suspense>
  );
}
