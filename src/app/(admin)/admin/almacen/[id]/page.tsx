"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

type CellProduct = {
  row: number;
  col: number;
  productId: string;
  productName: string;
  stock: number;
  salePrice: number | null;
  priceVaries: boolean;
  variants: { sku: string; stock: number; salePrice: number }[];
};

type LocationDetail = {
  id: string;
  name: string;
  maxRows: number;
  maxCols: number;
  label: string | null;
};

export default function AlmacenDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [cells, setCells] = useState<CellProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/warehouse/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar");
        if (cancelled) return;
        setLocation(data.location);
        setCells(data.cells ?? []);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Error al cargar la grilla",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const byCell = useMemo(() => {
    const map = new Map<string, CellProduct[]>();
    for (const cell of cells) {
      const key = `${cell.row}-${cell.col}`;
      const list = map.get(key) ?? [];
      list.push(cell);
      map.set(key, list);
    }
    return map;
  }, [cells]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/almacen">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
        <p className="text-muted-foreground">Ubicación no encontrada.</p>
      </div>
    );
  }

  const rows = Array.from({ length: location.maxRows }, (_, index) => index + 1);
  const cols = Array.from({ length: location.maxCols }, (_, index) => index + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href="/admin/almacen">
              <ArrowLeft className="mr-2 size-4" />
              Almacén
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-foreground">{location.name}</h1>
          <p className="text-sm text-muted-foreground">
            {location.maxRows} filas × {location.maxCols} columnas
            {location.label ? ` · ${location.label}` : ""}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="border-b border-r border-border px-3 py-2 text-left font-medium text-muted-foreground">
                Fila
              </th>
              {cols.map((col) => (
                <th
                  key={col}
                  className="border-b border-border px-3 py-2 text-left font-medium"
                >
                  Columna {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <th className="border-r border-t border-border bg-muted/30 px-3 py-3 text-left font-medium">
                  Fila {row}
                </th>
                {cols.map((col) => {
                  const items = byCell.get(`${row}-${col}`) ?? [];
                  return (
                    <td
                      key={col}
                      className="min-w-44 border-t border-border px-3 py-3 align-top"
                    >
                      {items.length === 0 ? (
                        <p className="text-muted-foreground">Vacío</p>
                      ) : (
                        <div className="space-y-3">
                          {items.map((item) => (
                            <div key={item.productId} className="space-y-1">
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                Stock: {item.stock}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Precio de venta:{" "}
                                {item.salePrice == null
                                  ? "—"
                                  : item.priceVaries
                                    ? `desde ${formatPrice(item.salePrice)}`
                                    : formatPrice(item.salePrice)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
