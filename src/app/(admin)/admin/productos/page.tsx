"use client";

import { Edit, ImageIcon, Power } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
  {
    id: "p1",
    name: "Llave ajustable 10\" Tramontina",
    sku: "TRA-AJ-10",
    price: 24_500,
    stock: 42,
    active: true,
    category: "Herramientas",
    brand: "Tramontina",
    image: null,
  },
  {
    id: "p2",
    name: "Grifería monocomando cocina Peirano",
    sku: "PEI-MC-COC",
    price: 189_900,
    stock: 8,
    active: true,
    category: "Griferías",
    brand: "Peirano",
    image: null,
  },
  {
    id: "p3",
    name: "Inodoro largo Ferrum Veneto",
    sku: "FER-VEN-L",
    price: 312_000,
    stock: 3,
    active: true,
    category: "Inodoros",
    brand: "Ferrum",
    image: null,
  },
  {
    id: "p4",
    name: "Caño PVC presión Ø32 mm x 4 m",
    sku: "PVC-32-4",
    price: 8750,
    stock: 120,
    active: true,
    category: "Cañerías PVC",
    brand: "Tigre",
    image: null,
  },
  {
    id: "p5",
    name: "Pintura látex interior blanco 20 L",
    sku: "PLA-LX-20W",
    price: 95_400,
    stock: 15,
    active: true,
    category: "Pinturas",
    brand: "Plavicon",
    image: null,
  },
  {
    id: "p6",
    name: "Termofusora PPR 800 W con boquillas",
    sku: "PPR-TF800",
    price: 156_000,
    stock: 6,
    active: true,
    category: "Cañerías PPR",
    brand: "Rothenberger",
    image: null,
  },
  {
    id: "p7",
    name: "Vanitory 60 cm melamina blanco",
    sku: "VAN-60-W",
    price: 178_500,
    stock: 4,
    active: true,
    category: "Vanitorys",
    brand: "FV",
    image: null,
  },
  {
    id: "p8",
    name: "Taladro percutor 13 mm 550 W",
    sku: "BOS-TSB550",
    price: 89_990,
    stock: 0,
    active: false,
    category: "Herramientas",
    brand: "Bosch",
    image: null,
  },
  {
    id: "p9",
    name: "Cinta métrica 8 m magnética",
    sku: "FIS-CM8",
    price: 12_300,
    stock: 55,
    active: true,
    category: "Herramientas",
    brand: "Fischer",
    image: null,
  },
  {
    id: "p10",
    name: "Soldadura estaño 60/40 barra 250 g",
    sku: "SOL-6040-250",
    price: 18_200,
    stock: 2,
    active: true,
    category: "Cañerías",
    brand: "Genérico",
    image: null,
  },
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

  const categories = useMemo(
    () => [...new Set(MOCK_PRODUCTS.map((p) => p.category))].sort(),
    [],
  );
  const brands = useMemo(
    () => [...new Set(MOCK_PRODUCTS.map((p) => p.brand))].sort(),
    [],
  );

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

  const columns: DataTableColumn<ProductRow>[] = [
    {
      id: "image",
      header: "Imagen",
      sortable: false,
      cell: (row) =>
        row.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.image}
            alt=""
            className="size-10 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted">
            <ImageIcon className="size-4 text-muted-foreground" />
          </div>
        ),
    },
    {
      id: "name",
      header: "Nombre",
      accessor: "name",
      sortable: true,
    },
    { id: "sku", header: "SKU", accessor: "sku", sortable: true },
    {
      id: "price",
      header: "Precio",
      accessor: "price",
      sortable: true,
      cell: (row) => formatPrice(row.price),
    },
    { id: "stock", header: "Stock", accessor: "stock", sortable: true },
    {
      id: "active",
      header: "Estado",
      sortable: true,
      accessor: "active",
      cell: (row) => (
        <Badge variant={row.active ? "default" : "secondary"}>
          {row.active ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Catálogo de ferretería y sanitarios.
        </p>
        <Button asChild>
          <Link href="/admin/productos/nuevo">Nuevo producto</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Categoría
            </span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full min-w-[180px] border-border lg:w-48">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Marca
            </span>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="w-full min-w-[180px] border-border lg:w-48">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Stock
            </span>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full min-w-[180px] border-border lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquiera</SelectItem>
                <SelectItem value="low">Bajo (&lt; 5)</SelectItem>
                <SelectItem value="out">Sin stock</SelectItem>
                <SelectItem value="ok">OK (≥ 5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Buscar por nombre o SKU…"
        searchKeys={["name", "sku"]}
        pagination={{
          page,
          pageSize,
          total: rows.length,
          onPageChange: setPage,
        }}
        renderActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/admin/productos/${row.id}`} aria-label="Editar">
                <Edit className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Alternar activo"
              onClick={() =>
                setActiveMap((m) => ({ ...m, [row.id]: !row.active }))
              }
            >
              <Power className="size-4" />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
