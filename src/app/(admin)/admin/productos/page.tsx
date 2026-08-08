"use client";

import {
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  ImageIcon,
  Layers,
  ListChecks,
  Loader2,
  Percent,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { AdminProductsActiveFilterChips } from "@/components/admin/AdminProductsActiveFilterChips";
import {
  AdminProductsFiltersDialog,
  type AdminProductsFiltersValue,
} from "@/components/admin/AdminProductsFiltersDialog";
import { BulkProductEditDialog } from "@/components/admin/BulkProductEditDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  BULK_IMPORT_TEMPLATE_ROW,
  BULK_UPDATE_TEMPLATE_ROW,
  previewBulkSpreadsheetRows,
  type BulkParsePreview,
} from "@/lib/bulk-products-spreadsheet";
import { downloadFileFromResponse, downloadWorkbookClient } from "@/lib/spreadsheet-download";
import { useIsFullAdmin } from "@/hooks/use-is-admin";
import {
  appendAdminProductsNavParams,
  buildAdminProductsListPath,
  countAdminProductsListFilters,
  parseAdminProductsListSearchParams,
} from "@/lib/admin-products-list-url";
import { formatPrice } from "@/lib/utils";

type ProductApi = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  brand: { name: string } | null;
  categories: string | null;
  variants: {
    sku: string;
    price: number;
    stock: number;
    isActive: boolean;
  } | null;
  images: string | null;
  createdAt: string;
};

type ProductRow = ProductApi;
type FilterOption = { id: string; name: string };

const IMPORT_TEMPLATE = [BULK_IMPORT_TEMPLATE_ROW];
const UPDATE_TEMPLATE = [BULK_UPDATE_TEMPLATE_ROW];

const LIMIT = 20;

function AdminProductosPageInner() {
  const isFullAdmin = useIsFullAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialList = useMemo(
    () => parseAdminProductsListSearchParams(searchParams),
    [searchParams],
  );

  const [activeFilter, setActiveFilter] = useState<string>(
    initialList.active ?? "all",
  );
  const [brandIds, setBrandIds] = useState<string[]>(initialList.brands ?? []);
  const [supplierIds, setSupplierIds] = useState<string[]>(
    initialList.suppliers ?? [],
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(initialList.page ?? 1);
  const [searchInput, setSearchInput] = useState(initialList.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    initialList.search ?? "",
  );
  const skipFilterPageReset = useRef(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [suppliers, setSuppliers] = useState<FilterOption[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedNames, setSelectedNames] = useState<Record<string, string>>({});
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"import" | "update" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkLoadingMessage, setBulkLoadingMessage] = useState<string | null>(
    null,
  );
  const [bulkPreview, setBulkPreview] = useState<BulkParsePreview | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    created?: number;
    updated?: number;
    errors?: string[];
    warnings?: string[];
    processedRows?: number;
    inputRows?: number;
    skippedRows?: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (skipFilterPageReset.current) {
      skipFilterPageReset.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch, activeFilter, brandIds, supplierIds]);

  useEffect(() => {
    const next = buildAdminProductsListPath({
      search: debouncedSearch,
      page,
      active: activeFilter,
      brands: brandIds,
      suppliers: supplierIds,
    });
    const current = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [
    debouncedSearch,
    page,
    activeFilter,
    brandIds,
    supplierIds,
    pathname,
    router,
    searchParams,
  ]);

  const listReturnTo = useMemo(
    () =>
      buildAdminProductsListPath({
        search: debouncedSearch,
        page,
        active: activeFilter,
        brands: brandIds,
        suppliers: supplierIds,
      }),
    [debouncedSearch, page, activeFilter, brandIds, supplierIds],
  );

  const filterCount = useMemo(
    () =>
      countAdminProductsListFilters({
        active: activeFilter,
        brands: brandIds,
        suppliers: supplierIds,
      }),
    [activeFilter, brandIds, supplierIds],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        const suppliersRes = await fetch("/api/admin/suppliers?for=filter&limit=500");
        const suppliersData = await suppliersRes.json();

        if (!suppliersRes.ok) {
          throw new Error("No se pudieron cargar filtros");
        }

        if (!cancelled) {
          if (isFullAdmin) {
            const brandsRes = await fetch("/api/admin/brands?for=filter&limit=500");
            const brandsData = await brandsRes.json();
            if (brandsRes.ok) {
              setBrands(
                (brandsData.brands ?? []).map((brand: { id: string; name: string }) => ({
                  id: brand.id,
                  name: brand.name,
                })),
              );
            }
          }
          setSuppliers(
            (suppliersData.suppliers ?? []).map((supplier: { id: string; name: string }) => ({
              id: supplier.id,
              name: supplier.name,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          toast.error("No se pudieron cargar marcas y proveedores");
        }
      }
    }

    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, [isFullAdmin]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("active", activeFilter);
      if (brandIds.length > 0) params.set("brands", brandIds.join(","));
      if (supplierIds.length > 0) params.set("suppliers", supplierIds.join(","));
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al cargar productos");
        setProducts([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }
      setProducts(data.products ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      toast.error("Error de red");
      setProducts([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeFilter, brandIds, supplierIds, page]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function handleSelectionChange(ids: Set<string>) {
    setSelectedIds(ids);
    setSelectedNames((prev) => {
      const next: Record<string, string> = {};
      for (const id of ids) {
        const onPage = products.find((p) => p.id === id);
        next[id] = onPage?.name ?? prev[id] ?? "Producto";
      }
      return next;
    });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar el producto");
        return;
      }
      toast.success("Producto eliminado");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      await loadProducts();
    } catch {
      toast.error("Error de conexión al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  async function downloadFilteredExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format: "xlsx" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("active", activeFilter);
      if (brandIds.length > 0) params.set("brands", brandIds.join(","));
      if (supplierIds.length > 0) params.set("suppliers", supplierIds.join(","));

      const date = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/admin/products/export?${params.toString()}`, {
        credentials: "same-origin",
      });

      await downloadFileFromResponse(res, `productos_${date}.xlsx`);

      const count = res.headers.get("X-Export-Row-Count");
      toast.success(
        count
          ? `${count} variantes exportadas`
          : "Listado exportado correctamente",
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al descargar Excel";
      if (message.includes("vacío") || message.includes("No hay productos")) {
        toast.info("No hay productos para exportar con los filtros actuales");
      } else {
        toast.error(message);
      }
    } finally {
      setExporting(false);
    }
  }

  function downloadTemplate(type: "import" | "update") {
    const data = type === "import" ? IMPORT_TEMPLATE : UPDATE_TEMPLATE;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      type === "import" ? "Alta masiva" : "Modificacion masiva",
    );
    downloadWorkbookClient(
      wb,
      type === "import"
        ? "template_alta_productos.xlsx"
        : "template_modificacion_productos.xlsx",
    );
    toast.success("Plantilla descargada");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bulkMode) return;
    setBulkLoading(true);
    setBulkLoadingMessage("Leyendo archivo…");
    setBulkResults(null);
    setBulkPreview(null);

    try {
      const raw = await file.arrayBuffer();
      const wb = XLSX.read(raw, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        toast.error("El archivo no tiene hojas de cálculo.");
        return;
      }
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: "" }) as Record<
        string,
        unknown
      >[];

      if (rows.length === 0) {
        toast.error(
          "No se encontraron filas de datos. Verificá que haya productos debajo del encabezado.",
        );
        return;
      }

      const preview = previewBulkSpreadsheetRows(rows, bulkMode);
      setBulkPreview(preview);

      if (preview.processableRows === 0) {
        const msg =
          bulkMode === "import"
            ? `Se leyeron ${preview.totalRows} filas pero ninguna tiene nombre. Completá la columna "nombre" (el SKU es opcional).`
            : `Se leyeron ${preview.totalRows} filas pero ninguna tiene SKU. La modificación masiva requiere SKU en cada fila.`;
        toast.error(msg);
        setBulkResults({
          errors: [msg],
          created: 0,
          updated: 0,
          warnings: [],
          inputRows: preview.totalRows,
          processedRows: 0,
        });
        return;
      }

      if (bulkMode === "import" && preview.withSku === 0) {
        toast.info(
          `${preview.processableRows} productos sin SKU: se generarán códigos automáticamente.`,
          { duration: 6000 },
        );
      }

      setBulkLoadingMessage(
        `Procesando ${preview.processableRows} producto(s)… puede tardar unos minutos.`,
      );

      const action = bulkMode === "import" ? "import" : "update";
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, products: rows }),
      });

      const result = await res.json();

      if (!res.ok) {
        const message =
          result.error ||
          "No se pudo procesar el archivo. Revisá el formato del Excel.";
        toast.error(message);
        setBulkResults(
          result.results ?? {
            errors: [message],
            warnings: [],
            created: 0,
            updated: 0,
            inputRows: preview.totalRows,
            processedRows: 0,
          },
        );
        return;
      }

      const stats = result.results;
      setBulkResults(stats);

      if (stats) {
        const { created = 0, updated = 0, errors = [], warnings = [] } = stats;
        if (created > 0) toast.success(`${created} productos creados`);
        else if (updated > 0) toast.success(`${updated} productos actualizados`);
        else if (errors.length > 0) {
          toast.error(`${errors.length} error(es). Revisá el detalle abajo.`);
        } else if (warnings.length > 0) {
          toast.warning(
            `Proceso finalizado con ${warnings.length} aviso(s). Revisá el detalle.`,
          );
        } else {
          toast.warning(
            "No se creó ni actualizó ningún producto. Revisá el detalle.",
          );
        }
      }
      if (res.ok) void loadProducts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al procesar el archivo";
      toast.error(message);
      setBulkResults({
        errors: [message],
        warnings: [],
        created: 0,
        updated: 0,
      });
    } finally {
      setBulkLoading(false);
      setBulkLoadingMessage(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const columns: DataTableColumn<ProductRow>[] = useMemo(
    () => [
      {
        id: "image",
        header: "Imagen",
        sortable: false,
        cell: (row) =>
          row.images ? (
            <img
              src={row.images}
              alt=""
              className="size-10 rounded-md object-cover"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted">
              <ImageIcon className="size-4 text-muted-foreground" />
            </div>
          ),
      },
      { id: "name", header: "Nombre", accessor: "name", sortable: true },
      {
        id: "sku",
        header: "SKU",
        accessor: (row) => row.variants?.sku ?? "—",
        sortable: true,
      },
      {
        id: "price",
        header: "Precio",
        accessor: (row) => row.variants?.price ?? 0,
        sortable: true,
        cell: (row) =>
          row.variants
            ? formatPrice(row.variants.price)
            : "—",
      },
      {
        id: "stock",
        header: "Stock",
        accessor: (row) => row.variants?.stock ?? 0,
        sortable: true,
      },
      {
        id: "active",
        header: "Estado",
        accessor: "isActive",
        sortable: true,
        cell: (row) =>
          isFullAdmin ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={row.isActive}
                onCheckedChange={() => handleToggleActive(row.id, !row.isActive)}
                aria-label={row.isActive ? "Desactivar" : "Activar"}
              />
              <span className={`text-xs ${row.isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
                {row.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          ) : (
            <Badge variant={row.isActive ? "default" : "secondary"}>
              {row.isActive ? "Activo" : "Inactivo"}
            </Badge>
          ),
      },
    ],
    [isFullAdmin],
  );

  function handleApplyFilters(value: AdminProductsFiltersValue) {
    setActiveFilter(value.active);
    setBrandIds(value.brandIds);
    setSupplierIds(value.supplierIds);
  }

  async function handleToggleActive(productId: string, newState: boolean) {
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newState }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, isActive: newState } : p)),
        );
        toast.success(newState ? "Producto activado" : "Producto desactivado");
      } else {
        toast.error("Error al cambiar estado");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Catálogo de ferretería y sanitarios.
        </p>
        {isFullAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/admin/productos/actualizar-precios">
                <Percent className="size-4" />
                Actualizar precios
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkEditOpen(true)}
            >
              <ListChecks className="size-4" />
              Edición masiva web
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setBulkMode("import");
                setBulkResults(null);
              }}
            >
              <Upload className="size-4" />
              Alta masiva
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setBulkMode("update");
                setBulkResults(null);
              }}
            >
              <Edit className="size-4" />
              Modificación masiva
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/admin/productos/atributos">
                <Layers className="size-4" />
                Administrar Sub Categorías
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/productos/nuevo">Nuevo producto</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <AdminProductsActiveFilterChips
        active={activeFilter}
        brandIds={brandIds}
        supplierIds={supplierIds}
        brands={brands}
        suppliers={suppliers}
        showBrands={isFullAdmin}
        onRemoveActive={() => setActiveFilter("all")}
        onRemoveBrand={(id) =>
          setBrandIds((prev) => prev.filter((brandId) => brandId !== id))
        }
        onRemoveSupplier={(id) =>
          setSupplierIds((prev) => prev.filter((supplierId) => supplierId !== id))
        }
        onClearAll={() => {
          setActiveFilter("all");
          setBrandIds([]);
          setSupplierIds([]);
        }}
      />

      <DataTable
        columns={columns}
        data={products}
        searchPlaceholder="Buscar por nombre, SKU o EAN…"
        externalSearch={{ value: searchInput, onChange: setSearchInput }}
        isLoading={loading}
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              Filtros
              {filterCount > 0 ? (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                  {filterCount}
                </Badge>
              ) : null}
            </Button>
            {isFullAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Descargar Excel (filtros actuales, todas las páginas)"
                aria-label="Descargar Excel del listado filtrado"
                disabled={exporting}
                onClick={() => void downloadFilteredExport()}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="size-4 text-emerald-700" />
                )}
              </Button>
            ) : null}
          </div>
        }
        showCheckbox={isFullAdmin}
        selection={
          isFullAdmin
            ? {
                selectedIds,
                onSelectionChange: handleSelectionChange,
              }
            : undefined
        }
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
              <Link
                href={appendAdminProductsNavParams(
                  `/admin/productos/detalle/${row.id}`,
                  { returnTo: listReturnTo },
                )}
                aria-label="Ver detalle"
              >
                <Eye className="size-4" />
              </Link>
            </Button>
            {isFullAdmin ? (
              <>
                <Button variant="ghost" size="icon" asChild>
                  <Link
                    href={appendAdminProductsNavParams(
                      `/admin/productos/${row.id}`,
                      { returnTo: listReturnTo },
                    )}
                    aria-label="Editar"
                  >
                    <Edit className="size-4" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  aria-label="Eliminar"
                  onClick={() => setDeleteTarget(row)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            ) : null}
          </div>
        )}
      />

      <AdminProductsFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        brands={brands}
        suppliers={suppliers}
        showBrands={isFullAdmin}
        applied={{
          active: activeFilter,
          brandIds,
          supplierIds,
        }}
        onApply={handleApplyFilters}
      />

      <BulkProductEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        productIds={[...selectedIds]}
        productNames={[...selectedIds].map((id) => selectedNames[id] ?? id)}
        brands={brands}
        suppliers={suppliers}
        onSuccess={() => {
          setSelectedIds(new Set());
          setSelectedNames({});
          void loadProducts();
        }}
      />

      <Dialog
        open={!!bulkMode}
        onOpenChange={(open) => {
          if (!open) {
            setBulkMode(null);
            setBulkPreview(null);
            setBulkResults(null);
            setBulkLoadingMessage(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bulkMode === "import"
                ? "Alta masiva de productos"
                : "Modificación masiva de productos"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {bulkMode === "import"
                ? "Subí un Excel (.xlsx) con productos nuevos. Columnas: nombre (obligatorio), sku (opcional, se genera solo), ean, precio_compra, precio_venta, stock, stock_minimo, marca, proveedor, categorias (separadas por ;), descripcion, descripcion_corta."
                : "Subí un Excel (.xlsx) para modificar. El sku es obligatorio. Solo se actualizan las columnas con valor. Mismos nombres de columna que en el alta (incluye stock_minimo)."}
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => downloadTemplate(bulkMode!)}
            >
              <Download className="size-4" />
              Descargar plantilla de ejemplo
            </Button>
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="bulk-file"
                disabled={bulkLoading}
              />
              <label htmlFor="bulk-file" className="cursor-pointer">
                {bulkLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {bulkLoadingMessage ?? "Procesando…"}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="size-8 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Clic para seleccionar archivo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      .xlsx o .xls
                    </span>
                  </div>
                )}
              </label>
            </div>
            {bulkPreview && !bulkLoading ? (
              <p className="text-xs text-muted-foreground">
                Archivo: {bulkPreview.processableRows} fila(s) a procesar de{" "}
                {bulkPreview.totalRows} leída(s)
                {bulkPreview.withSku > 0
                  ? ` · ${bulkPreview.withSku} con SKU`
                  : bulkMode === "import"
                    ? " · sin SKU (se generarán automáticamente)"
                    : ""}
              </p>
            ) : null}
            {bulkResults ? (
              <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm font-semibold">Resultados</p>
                {bulkResults.inputRows != null ? (
                  <p className="text-xs text-muted-foreground">
                    Filas en Excel: {bulkResults.inputRows}
                    {bulkResults.processedRows != null
                      ? ` · Procesadas: ${bulkResults.processedRows}`
                      : ""}
                  </p>
                ) : null}
                {bulkResults.created != null && bulkResults.created > 0 ? (
                  <p className="text-sm text-emerald-600">
                    + {bulkResults.created} productos creados
                  </p>
                ) : null}
                {bulkResults.updated != null && bulkResults.updated > 0 ? (
                  <p className="text-sm text-blue-600">
                    ~ {bulkResults.updated} productos actualizados
                  </p>
                ) : null}
                {bulkResults.warnings != null && bulkResults.warnings.length > 0 ? (
                  <div>
                    <p className="text-sm text-amber-700">
                      {bulkResults.warnings.length} avisos:
                    </p>
                    <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-amber-800/90">
                      {bulkResults.warnings.map((w, i) => (
                        <li key={i}>- {w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {bulkResults.errors != null && bulkResults.errors.length > 0 ? (
                  <div>
                    <p className="text-sm text-destructive">
                      {bulkResults.errors.length} errores:
                    </p>
                    <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                      {bulkResults.errors.map((err, i) => (
                        <li key={i}>- {err}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(bulkResults.created ?? 0) === 0 &&
                (bulkResults.updated ?? 0) === 0 &&
                (bulkResults.errors?.length ?? 0) === 0 &&
                (bulkResults.warnings?.length ?? 0) === 0 ? (
                  <p className="text-sm text-amber-700">
                    No se creó ni actualizó ningún producto. Revisá que el
                    archivo tenga datos en las columnas correctas.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar producto?</DialogTitle>
            <DialogDescription>
              Vas a eliminar permanentemente{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              del catálogo. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Los pedidos anteriores conservan el nombre, precio y cantidad vendida.
            Las estadísticas de ventas (unidades e ingresos) no se modifican.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar producto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminProductosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminProductosPageInner />
    </Suspense>
  );
}
