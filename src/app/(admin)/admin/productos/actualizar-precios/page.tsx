"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildPriceUpdatePreview,
  type PriceUpdateCatalogRow,
  type PriceUpdatePreviewRow,
} from "@/lib/bulk-price-update";
import { useIsFullAdmin } from "@/hooks/use-is-admin";
import { cn, formatPrice } from "@/lib/utils";

type FilterOption = { id: string; name: string };

type UpdateFailure = {
  variantId: string;
  sku: string;
  description: string;
  error: string;
};

const PAGE_SIZE = 50;
const STEPS = [
  "Seleccionar productos",
  "Porcentajes",
  "Confirmación",
  "Actualización",
] as const;

function formatCost(value: number | null): string {
  return value != null ? formatPrice(value) : "—";
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap gap-2 text-sm">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const active = step === current;
        const done = step < current;
        return (
          <li
            key={label}
            className={cn(
              "rounded-full border px-3 py-1",
              active && "border-primary bg-primary/10 font-semibold text-primary",
              done && "border-emerald-300 bg-emerald-50 text-emerald-800",
              !active && !done && "border-border text-muted-foreground",
            )}
          >
            {step}. {label}
          </li>
        );
      })}
    </ol>
  );
}

export default function ActualizarPreciosPage() {
  const router = useRouter();
  const isFullAdmin = useIsFullAdmin();
  const [step, setStep] = useState(1);

  const [brandFilter, setBrandFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [suppliers, setSuppliers] = useState<FilterOption[]>([]);

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PriceUpdateCatalogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<
    Record<string, PriceUpdateCatalogRow>
  >({});

  const [costPercent, setCostPercent] = useState("0");
  const [salePercent, setSalePercent] = useState("0");

  const [preview, setPreview] = useState<PriceUpdatePreviewRow[]>([]);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState<UpdateFailure[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    if (!isFullAdmin) return;
    Promise.all([
      fetch("/api/admin/brands?limit=200").then((r) => r.json()),
      fetch("/api/admin/suppliers?limit=200").then((r) => r.json()),
    ])
      .then(([brandsData, suppliersData]) => {
        setBrands(
          (brandsData.brands ?? []).map((b: { id: string; name: string }) => ({
            id: b.id,
            name: b.name,
          })),
        );
        setSuppliers(
          (suppliersData.suppliers ?? []).map(
            (s: { id: string; name: string }) => ({
              id: s.id,
              name: s.name,
            }),
          ),
        );
      })
      .catch(() => toast.error("No se pudieron cargar filtros"));
  }, [isFullAdmin]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [brandFilter, supplierFilter, debouncedSearch]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (brandFilter !== "all") params.set("brand", brandFilter);
      if (supplierFilter !== "all") params.set("supplier", supplierFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/products/price-update?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al cargar productos");
        setRows([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      toast.error("Error de red");
      setRows([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [brandFilter, supplierFilter, debouncedSearch, page]);

  useEffect(() => {
    if (isFullAdmin) void loadRows();
  }, [isFullAdmin, loadRows]);

  useEffect(() => {
    if (!isFullAdmin) {
      router.replace("/admin/productos");
    }
  }, [isFullAdmin, router]);

  function handleSelectionChange(ids: Set<string>) {
    setSelectedIds(ids);
    setSelectedRows((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        const onPage = rows.find((r) => r.id === id);
        if (onPage) next[id] = onPage;
      }
      for (const key of Object.keys(next)) {
        if (!ids.has(key)) delete next[key];
      }
      return next;
    });
  }

  const selectedList = useMemo(
    () => Object.values(selectedRows),
    [selectedRows],
  );

  const parsedCostPercent = Number(costPercent) || 0;
  const parsedSalePercent = Number(salePercent) || 0;
  const canContinueStep2 =
    parsedCostPercent !== 0 || parsedSalePercent !== 0;

  const columns: DataTableColumn<PriceUpdateCatalogRow>[] = useMemo(
    () => [
      { id: "sku", header: "SKU", accessor: "sku" },
      {
        id: "ean",
        header: "EAN",
        cell: (row) => row.ean || "—",
      },
      { id: "description", header: "Descripción", accessor: "description" },
      {
        id: "costPrice",
        header: "Precio compra",
        cell: (row) => formatCost(row.costPrice),
        className: "text-right",
      },
      {
        id: "price",
        header: "Precio venta",
        cell: (row) => formatPrice(row.price),
        className: "text-right",
      },
    ],
    [],
  );

  function goToStep2() {
    if (selectedIds.size === 0) return;
    setStep(2);
  }

  function goToStep3() {
    if (!canContinueStep2) return;
    setPreview(
      buildPriceUpdatePreview(
        selectedList,
        parsedCostPercent,
        parsedSalePercent,
      ),
    );
    setStep(3);
  }

  async function runUpdates() {
    setStep(4);
    setUpdating(true);
    setProgress(0);
    setFailures([]);
    setSuccessCount(0);

    const totalItems = preview.length;
    let ok = 0;

    for (let i = 0; i < preview.length; i++) {
      const item = preview[i];
      const payload: Record<string, unknown> = { variantId: item.variantId };

      if (parsedCostPercent !== 0 && !item.costUpdateSkipped) {
        payload.costPrice = item.newCostPrice;
      }
      if (parsedSalePercent !== 0) {
        payload.price = item.newSalePrice;
      }

      if (Object.keys(payload).length <= 1) {
        ok++;
        setProgress(Math.round(((i + 1) / totalItems) * 100));
        continue;
      }

      try {
        const res = await fetch("/api/admin/products/price-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setFailures((prev) => [
            ...prev,
            {
              variantId: item.variantId,
              sku: item.sku,
              description: item.description,
              error: data.error ?? "Error al actualizar",
            },
          ]);
        } else {
          ok++;
        }
      } catch {
        setFailures((prev) => [
          ...prev,
          {
            variantId: item.variantId,
            sku: item.sku,
            description: item.description,
            error: "Error de conexión",
          },
        ]);
      }

      setSuccessCount(ok);
      setProgress(Math.round(((i + 1) / totalItems) * 100));
    }

    setUpdating(false);
  }

  if (!isFullAdmin) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/productos">Productos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Actualizar precios</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Actualizar precios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajustá precios de compra y venta por porcentaje sobre los productos
            seleccionados.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/admin/productos">
            <ArrowLeft className="size-4" />
            Volver a productos
          </Link>
        </Button>
      </div>

      <StepIndicator current={step} />

      {step === 1 ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Marca
              </span>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-full min-w-[180px] border-border sm:w-56">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Proveedor
              </span>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-full min-w-[180px] border-border sm:w-56">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={rows}
            isLoading={loading}
            showCheckbox
            searchPlaceholder="Buscar por SKU, EAN o descripción…"
            externalSearch={{ value: searchInput, onChange: setSearchInput }}
            selection={{
              selectedIds,
              onSelectionChange: handleSelectionChange,
            }}
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total,
              totalPages,
              fromServer: true,
              onPageChange: setPage,
            }}
          />

          <div className="flex justify-end">
            <Button disabled={selectedIds.size === 0} onClick={goToStep2}>
              Siguiente
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mx-auto max-w-lg space-y-6">
          <p className="text-sm text-muted-foreground">
            Ingresá el porcentaje de ajuste para cada tipo de precio. Podés usar
            valores negativos para reducir precios. Un valor en 0 no modifica ese
            precio.
          </p>
          <p className="text-sm font-medium">
            {selectedIds.size} producto{selectedIds.size !== 1 ? "s" : ""}{" "}
            seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </p>

          <div className="space-y-2">
            <Label htmlFor="cost-percent">Precio de compra (%)</Label>
            <Input
              id="cost-percent"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={costPercent}
              onChange={(e) => setCostPercent(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sale-percent">Precio de venta (%)</Label>
            <Input
              id="sale-percent"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={salePercent}
              onChange={(e) => setSalePercent(e.target.value)}
            />
          </div>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button disabled={!canContinueStep2} onClick={goToStep3}>
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Revisá los precios calculados antes de confirmar. Compra:{" "}
            <strong>{parsedCostPercent}%</strong> — Venta:{" "}
            <strong>{parsedSalePercent}%</strong>
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Compra actual</TableHead>
                  <TableHead className="text-right">Compra nuevo</TableHead>
                  <TableHead className="text-right">Venta actual</TableHead>
                  <TableHead className="text-right">Venta nuevo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row) => (
                  <TableRow key={row.variantId}>
                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell className="text-right">
                      {formatCost(row.currentCostPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.costUpdateSkipped ? (
                        <span className="text-muted-foreground">Sin cambio</span>
                      ) : parsedCostPercent !== 0 ? (
                        formatCost(row.newCostPrice)
                      ) : (
                        formatCost(row.currentCostPrice)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(row.currentSalePrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {parsedSalePercent !== 0
                        ? formatPrice(row.newSalePrice)
                        : formatPrice(row.currentSalePrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button onClick={() => void runUpdates()}>Confirmar</Button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mx-auto max-w-xl space-y-6">
          {updating ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Actualizando precios…</p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {progress}% — {successCount} de {preview.length} actualizados
              </p>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-border bg-card p-6">
              {failures.length === 0 ? (
                <>
                  <p className="text-lg font-semibold text-emerald-700">
                    Operación exitosa
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Se actualizaron {successCount} producto
                    {successCount !== 1 ? "s" : ""} correctamente.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-amber-800">
                    Operación finalizada con observaciones
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {successCount} actualizado{successCount !== 1 ? "s" : ""},{" "}
                    {failures.length} con error.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Ítems no actualizados:</p>
                    <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                      {failures.map((f) => (
                        <li
                          key={f.variantId}
                          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                        >
                          <span className="font-mono">{f.sku}</span> —{" "}
                          {f.description}
                          <br />
                          <span className="text-amber-900">{f.error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild>
                  <Link href="/admin/productos">Volver a productos</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setSelectedIds(new Set());
                    setSelectedRows({});
                    setCostPercent("0");
                    setSalePercent("0");
                    setPreview([]);
                    setFailures([]);
                    setProgress(0);
                    setSuccessCount(0);
                    void loadRows();
                  }}
                >
                  Nueva actualización
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
