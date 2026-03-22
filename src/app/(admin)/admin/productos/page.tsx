"use client";

import { Download, Edit, ImageIcon, Loader2, Power, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  active: boolean;
  category: string;
  brand: string;
  image: string | null;
};

const MOCK_PRODUCTS: ProductRow[] = [
  { id: "p1", name: "Llave ajustable 10\" Tramontina", sku: "TRA-AJ-10", price: 24500, stock: 42, active: true, category: "Herramientas", brand: "Tramontina", image: null },
  { id: "p2", name: "Griferia monocomando cocina Peirano", sku: "PEI-MC-COC", price: 189900, stock: 8, active: true, category: "Griferias", brand: "Peirano", image: null },
  { id: "p3", name: "Inodoro largo Ferrum Veneto", sku: "FER-VEN-L", price: 312000, stock: 3, active: true, category: "Inodoros", brand: "Ferrum", image: null },
  { id: "p4", name: "Canio PVC presion 32 mm x 4 m", sku: "PVC-32-4", price: 8750, stock: 120, active: true, category: "Canierias PVC", brand: "Tigre", image: null },
  { id: "p5", name: "Pintura latex interior blanco 20 L", sku: "PLA-LX-20W", price: 95400, stock: 15, active: true, category: "Pinturas", brand: "Plavicon", image: null },
  { id: "p6", name: "Termofusora PPR 800 W con boquillas", sku: "PPR-TF800", price: 156000, stock: 6, active: true, category: "Canierias PPR", brand: "Rothenberger", image: null },
  { id: "p7", name: "Vanitory 60 cm melamina blanco", sku: "VAN-60-W", price: 178500, stock: 4, active: true, category: "Vanitorys", brand: "FV", image: null },
  { id: "p8", name: "Taladro percutor 13 mm 550 W", sku: "BOS-TSB550", price: 89990, stock: 0, active: false, category: "Herramientas", brand: "Bosch", image: null },
  { id: "p9", name: "Cinta metrica 8 m magnetica", sku: "FIS-CM8", price: 12300, stock: 55, active: true, category: "Herramientas", brand: "Fischer", image: null },
  { id: "p10", name: "Soldadura estanio 60/40 barra 250 g", sku: "SOL-6040-250", price: 18200, stock: 2, active: true, category: "Canierias", brand: "Generico", image: null },
];

const IMPORT_TEMPLATE = [
  { name: "Producto ejemplo 1", sku: "SKU-001", price: 10000, comparePrice: 12000, stock: 50, brand: "MarcaX", description: "Descripcion del producto", shortDesc: "Resumen corto" },
  { name: "Producto ejemplo 2", sku: "SKU-002", price: 25000, comparePrice: "", stock: 10, brand: "MarcaY", description: "Otra descripcion", shortDesc: "Otro resumen" },
];

const UPDATE_TEMPLATE = [
  { sku: "SKU-001", name: "", price: 15000, comparePrice: "", stock: 45, description: "", shortDesc: "" },
  { sku: "SKU-002", name: "", price: "", comparePrice: "", stock: 20, description: "", shortDesc: "" },
];

export default function AdminProductosPage() {
  const [category, setCategory] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK_PRODUCTS.map((p) => [p.id, p.active])),
  );
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [bulkMode, setBulkMode] = useState<"import" | "update" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => [...new Set(MOCK_PRODUCTS.map((p) => p.category))].sort(), []);
  const brands = useMemo(() => [...new Set(MOCK_PRODUCTS.map((p) => p.brand))].sort(), []);

  const rows = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (brand !== "all" && p.brand !== brand) return false;
      if (stockFilter === "low" && p.stock >= 5) return false;
      if (stockFilter === "out" && p.stock > 0) return false;
      if (stockFilter === "ok" && (p.stock < 5 || p.stock === 0)) return false;
      return true;
    }).map((p) => ({ ...p, active: activeMap[p.id] ?? p.active }));
  }, [category, brand, stockFilter, activeMap]);

  function downloadTemplate(type: "import" | "update") {
    const data = type === "import" ? IMPORT_TEMPLATE : UPDATE_TEMPLATE;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === "import" ? "Alta masiva" : "Modificacion masiva");
    XLSX.writeFile(wb, type === "import" ? "template_alta_productos.xlsx" : "template_modificacion_productos.xlsx");
    toast.success("Plantilla descargada");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bulkMode) return;
    setBulkLoading(true);
    setBulkResults(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as any[];

      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: bulkMode, products: rows }),
      });

      const result = await res.json();
      setBulkResults(result.results);

      if (result.results) {
        const { created, updated, errors } = result.results;
        if (created > 0) toast.success(`${created} productos creados`);
        if (updated > 0) toast.success(`${updated} productos actualizados`);
        if (errors?.length > 0) toast.error(`${errors.length} errores encontrados`);
      }
    } catch {
      toast.error("Error al procesar el archivo");
    } finally {
      setBulkLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const columns: DataTableColumn<ProductRow>[] = [
    { id: "image", header: "Imagen", sortable: false, cell: (row) => row.image ? (
      <img src={row.image} alt="" className="size-10 rounded-md object-cover" />
    ) : (
      <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted"><ImageIcon className="size-4 text-muted-foreground" /></div>
    )},
    { id: "name", header: "Nombre", accessor: "name", sortable: true },
    { id: "sku", header: "SKU", accessor: "sku", sortable: true },
    { id: "price", header: "Precio", accessor: "price", sortable: true, cell: (row) => formatPrice(row.price) },
    { id: "stock", header: "Stock", accessor: "stock", sortable: true },
    { id: "active", header: "Estado", sortable: true, accessor: "active", cell: (row) => <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Activo" : "Inactivo"}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Catalogo de ferreteria y sanitarios.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { setBulkMode("import"); setBulkResults(null); }}>
            <Upload className="size-4" />Alta masiva
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { setBulkMode("update"); setBulkResults(null); }}>
            <Edit className="size-4" />Modificacion masiva
          </Button>
          <Button asChild><Link href="/admin/productos/nuevo">Nuevo producto</Link></Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Categoria</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full min-w-[180px] border-border lg:w-48"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Marca</span>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="w-full min-w-[180px] border-border lg:w-48"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Stock</span>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full min-w-[180px] border-border lg:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquiera</SelectItem>
                <SelectItem value="low">Bajo (menor a 5)</SelectItem>
                <SelectItem value="out">Sin stock</SelectItem>
                <SelectItem value="ok">OK (5 o mas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Buscar por nombre o SKU..."
        searchKeys={["name", "sku"]}
        pagination={{ page, pageSize, total: rows.length, onPageChange: setPage }}
        renderActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" asChild><Link href={`/admin/productos/${row.id}`} aria-label="Editar"><Edit className="size-4" /></Link></Button>
            <Button variant="ghost" size="icon" aria-label="Alternar activo" onClick={() => setActiveMap((m) => ({ ...m, [row.id]: !row.active }))}><Power className="size-4" /></Button>
          </div>
        )}
      />

      <Dialog open={!!bulkMode} onOpenChange={(open) => { if (!open) setBulkMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{bulkMode === "import" ? "Alta masiva de productos" : "Modificacion masiva de productos"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {bulkMode === "import"
                ? "Subi un archivo Excel (.xlsx) con los productos nuevos. Descarga la plantilla de ejemplo para ver el formato requerido."
                : "Subi un archivo Excel (.xlsx) con las modificaciones. El campo SKU es obligatorio para identificar cada producto. Solo se actualizan los campos con valor."}
            </p>
            <Button variant="outline" className="w-full gap-2" onClick={() => downloadTemplate(bulkMode!)}>
              <Download className="size-4" />Descargar plantilla de ejemplo
            </Button>
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="bulk-file" disabled={bulkLoading} />
              <label htmlFor="bulk-file" className="cursor-pointer">
                {bulkLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Procesando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="size-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Click para seleccionar archivo</span>
                    <span className="text-xs text-muted-foreground">.xlsx o .xls</span>
                  </div>
                )}
              </label>
            </div>
            {bulkResults && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                <p className="text-sm font-semibold">Resultados:</p>
                {bulkResults.created > 0 && <p className="text-sm text-emerald-600">+ {bulkResults.created} productos creados</p>}
                {bulkResults.updated > 0 && <p className="text-sm text-blue-600">~ {bulkResults.updated} productos actualizados</p>}
                {bulkResults.errors?.length > 0 && (
                  <div>
                    <p className="text-sm text-destructive">{bulkResults.errors.length} errores:</p>
                    <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                      {bulkResults.errors.map((err: string, i: number) => <li key={i}>- {err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
