"use client";

import { Download, Edit, Eye, ImageIcon, Layers, ListChecks, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { BulkProductEditDialog } from "@/components/admin/BulkProductEditDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  BULK_IMPORT_TEMPLATE_ROW,
  BULK_UPDATE_TEMPLATE_ROW,
} from "@/lib/bulk-products-spreadsheet";
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

export default function AdminProductosPage() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
  const [bulkResults, setBulkResults] = useState<{
    created?: number;
    updated?: number;
    errors?: string[];
    warnings?: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter, brandFilter, supplierFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        const [brandsRes, suppliersRes] = await Promise.all([
          fetch("/api/admin/brands?limit=100"),
          fetch("/api/admin/suppliers?limit=100"),
        ]);

        const [brandsData, suppliersData] = await Promise.all([
          brandsRes.json(),
          suppliersRes.json(),
        ]);

        if (!brandsRes.ok || !suppliersRes.ok) {
          throw new Error("No se pudieron cargar filtros");
        }

        if (!cancelled) {
          setBrands(
            (brandsData.brands ?? []).map((brand: { id: string; name: string }) => ({
              id: brand.id,
              name: brand.name,
            })),
          );
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
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("active", activeFilter);
      if (brandFilter !== "all") params.set("brand", brandFilter);
      if (supplierFilter !== "all") params.set("supplier", supplierFilter);
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
  }, [debouncedSearch, activeFilter, brandFilter, supplierFilter, page]);

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

  function downloadTemplate(type: "import" | "update") {
    const data = type === "import" ? IMPORT_TEMPLATE : UPDATE_TEMPLATE;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      type === "import" ? "Alta masiva" : "Modificacion masiva",
    );
    XLSX.writeFile(
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
    setBulkResults(null);

    try {
      const raw = await file.arrayBuffer();
      const wb = XLSX.read(raw);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

      const action = bulkMode === "import" ? "import" : "update";
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, products: rows }),
      });

      const result = await res.json();
      setBulkResults(result.results);

      if (result.results) {
        const { created, updated, errors, warnings } = result.results;
        if (created > 0) toast.success(`${created} productos creados`);
        if (updated > 0) toast.success(`${updated} productos actualizados`);
        if (warnings?.length > 0) {
          toast.warning(`${warnings.length} avisos (proveedor o categoría inexistente)`);
        }
        if (errors?.length > 0) toast.error(`${errors.length} errores encontrados`);
      }
      if (res.ok) void loadProducts();
    } catch {
      toast.error("Error al procesar el archivo");
    } finally {
      setBulkLoading(false);
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
        cell: (row) => (
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
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
        <div className="flex flex-wrap gap-2">
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
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Visibilidad
          </span>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-full min-w-[180px] border-border sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Solo activos</SelectItem>
              <SelectItem value="false">Solo inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Marca
          </span>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-full min-w-[180px] border-border sm:w-56">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
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
        data={products}
        searchPlaceholder="Buscar por nombre, SKU o EAN…"
        externalSearch={{ value: searchInput, onChange: setSearchInput }}
        isLoading={loading}
        showCheckbox
        selection={{
          selectedIds,
          onSelectionChange: handleSelectionChange,
        }}
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
                href={`/admin/productos/detalle/${row.id}`}
                aria-label="Ver detalle"
              >
                <Eye className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={`/admin/productos/${row.id}`}
                aria-label="Editar"
              >
                <Edit className="size-4" />
              </Link>
            </Button>
          </div>
        )}
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
          if (!open) setBulkMode(null);
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
                ? "Subí un Excel (.xlsx) con productos nuevos. Columnas: sku, ean, nombre, precio_compra, precio_venta, stock, marca, proveedor, categorias (separadas por ;), descripcion, descripcion_corta."
                : "Subí un Excel (.xlsx) para modificar. El sku es obligatorio. Solo se actualizan las columnas con valor. Mismos nombres de columna que en el alta."}
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
                      Procesando…
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
            {bulkResults ? (
              <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm font-semibold">Resultados:</p>
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
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
