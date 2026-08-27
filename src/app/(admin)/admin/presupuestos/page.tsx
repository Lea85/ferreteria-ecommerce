"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit, Eye, Loader2, MessageCircle, Search, X } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type QuoteApi = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  status: string;
  total: number;
  itemCount: number;
  validUntil: string;
  createdAt: string;
};

type CustomerOption = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  taxId: string | null;
  companyName: string | null;
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

function formatTaxId(taxId: string | null | undefined): string | null {
  if (!taxId) return null;
  const digits = taxId.replace(/\D/g, "");
  if (digits.length !== 11) return taxId;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function customerLabel(c: CustomerOption): string {
  return [c.name, c.lastName].filter(Boolean).join(" ");
}

function buildQuoteWhatsAppMessage(opts: {
  customerName: string;
  quoteNumber: string;
  total: number;
  validUntil: string;
}): string {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || "hola";
  const valid = formatDate(opts.validUntil);
  return [
    `Hola ${firstName}, te contacto por el presupuesto ${opts.quoteNumber}.`,
    "",
    `Total: ${formatPrice(opts.total)}`,
    `Válido hasta: ${valid}`,
  ].join("\n");
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

  const [selectedCustomers, setSelectedCustomers] = useState<CustomerOption[]>(
    [],
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);

  const selectedUserIds = useMemo(
    () => selectedCustomers.map((c) => c.id),
    [selectedCustomers],
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedCustomerSearch(customerSearch.trim()),
      300,
    );
    return () => clearTimeout(t);
  }, [customerSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, selectedUserIds]);

  useEffect(() => {
    if (debouncedCustomerSearch.length < 2) {
      setCustomerResults([]);
      return;
    }

    let cancelled = false;
    setSearchingCustomers(true);
    const params = new URLSearchParams({
      search: debouncedCustomerSearch,
      limit: "12",
      page: "1",
    });

    fetch(`/api/admin/users?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const selected = new Set(selectedUserIds);
        setCustomerResults(
          Array.isArray(data.users)
            ? data.users
                .map(
                  (u: {
                    id: string;
                    name: string;
                    lastName: string | null;
                    email: string;
                    taxId: string | null;
                    companyName: string | null;
                  }) => ({
                    id: u.id,
                    name: u.name,
                    lastName: u.lastName,
                    email: u.email,
                    taxId: u.taxId,
                    companyName: u.companyName,
                  }),
                )
                .filter((u: CustomerOption) => !selected.has(u.id))
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) setCustomerResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchingCustomers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCustomerSearch, selectedUserIds]);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (selectedUserIds.length > 0) {
        params.set("userIds", selectedUserIds.join(","));
      }
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
  }, [debouncedSearch, statusFilter, selectedUserIds, page]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  function addCustomer(customer: CustomerOption) {
    setSelectedCustomers((prev) =>
      prev.some((c) => c.id === customer.id) ? prev : [...prev, customer],
    );
    setCustomerSearch("");
    setCustomerResults([]);
  }

  function removeCustomer(id: string) {
    setSelectedCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  function handleWhatsAppQuote(row: QuoteApi) {
    if (!row.customerPhone) {
      toast.error("Este cliente no tiene teléfono cargado");
      return;
    }

    const message = buildQuoteWhatsAppMessage({
      customerName: row.customerName,
      quoteNumber: row.quoteNumber,
      total: row.total,
      validUntil: row.validUntil,
    });
    const waUrl = buildWhatsAppUrl(row.customerPhone, message);
    if (!waUrl) {
      toast.error("No se pudo armar el enlace de WhatsApp");
      return;
    }

    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

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
        id: "customer",
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
          <Badge variant={(STATUS_COLORS[row.status] as "default") || "secondary"}>
            {STATUS_LABELS[row.status] || row.status}
          </Badge>
        ),
      },
      {
        id: "items",
        header: "Ítems",
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
        cell: (row) => (
          <span className="text-muted-foreground">{formatDate(row.validUntil)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="quote-customer-filter" className="text-xs text-muted-foreground">
            Filtrar por cliente
          </Label>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="quote-customer-filter"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Nombre, email o CUIT/CUIL…"
              className="border-border pl-9"
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Buscá y seleccioná uno o más clientes para ver solo sus presupuestos.
          </p>
        </div>

        {debouncedCustomerSearch.length >= 2 ? (
          <div className="max-h-48 max-w-lg space-y-1 overflow-y-auto rounded-md border border-border bg-background p-2">
            {searchingCustomers ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando…
              </div>
            ) : customerResults.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sin resultados
              </p>
            ) : (
              customerResults.map((customer) => {
                const tax = formatTaxId(customer.taxId);
                return (
                  <button
                    key={customer.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => addCustomer(customer)}
                  >
                    <div>
                      <p className="font-medium">{customerLabel(customer)}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.email}
                      </p>
                      {tax ? (
                        <p className="font-mono text-xs text-muted-foreground">
                          {tax}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-primary">Agregar</span>
                  </button>
                );
              })
            )}
          </div>
        ) : null}

        {selectedCustomers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {selectedCustomers.map((customer) => (
              <Badge
                key={customer.id}
                variant="secondary"
                className="gap-1 pr-1 font-normal"
              >
                {customerLabel(customer)}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label={`Quitar ${customerLabel(customer)}`}
                  onClick={() => removeCustomer(customer.id)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedCustomers([])}
            >
              Limpiar clientes
            </Button>
          </div>
        ) : null}
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
            {row.status === "ACTIVE" ? (
              <Button variant="ghost" size="icon" asChild>
                <Link
                  href={`/admin/presupuestos/${row.id}/editar`}
                  aria-label="Editar presupuesto"
                >
                  <Edit className="size-4" />
                </Link>
              </Button>
            ) : null}
            {row.customerPhone ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Enviar por WhatsApp"
                title={`WhatsApp: ${row.customerPhone}`}
                onClick={() => handleWhatsAppQuote(row)}
              >
                <MessageCircle className="size-4 text-emerald-600" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled
                aria-label="Sin teléfono para WhatsApp"
                title="El cliente no tiene teléfono cargado"
              >
                <MessageCircle className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}
      />
    </div>
  );
}
