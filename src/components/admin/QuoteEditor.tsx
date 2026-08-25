"use client";

import { Loader2, Plus, Save, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

export type QuoteEditorItem = {
  variantId: string;
  productName: string;
  variantName?: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  currentStock?: number;
};

type SearchProduct = {
  variantId: string;
  productName: string;
  sku: string;
  currentStock: number;
  salePrice: number;
};

type QuoteEditorProps = {
  items: QuoteEditorItem[];
  onItemsChange: (items: QuoteEditorItem[]) => void;
  onSave: () => Promise<void>;
  saving?: boolean;
};

function lineSubtotal(item: QuoteEditorItem) {
  return Math.round(item.unitPrice * item.quantity * 100) / 100;
}

export function QuoteEditor({
  items,
  onItemsChange,
  onSave,
  saving = false,
}: QuoteEditorProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + lineSubtotal(item), 0),
    [items],
  );

  function updateQuantity(variantId: string, quantity: number) {
    onItemsChange(
      items.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.max(1, Math.floor(quantity) || 1) }
          : item,
      ),
    );
  }

  function removeItem(variantId: string) {
    onItemsChange(items.filter((item) => item.variantId !== variantId));
  }

  async function searchProducts() {
    const q = productSearch.trim();
    if (q.length < 2) {
      toast.error("Escribí al menos 2 caracteres para buscar");
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q });
      const res = await fetch(`/api/admin/supplier-orders/search-products?${params}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data.products) ? data.products : []);
    } catch {
      toast.error("Error al buscar productos");
    } finally {
      setSearching(false);
    }
  }

  function addProduct(product: SearchProduct) {
    const existing = items.find((i) => i.variantId === product.variantId);
    if (existing) {
      updateQuantity(product.variantId, existing.quantity + 1);
      toast.success("Cantidad incrementada");
    } else {
      onItemsChange([
        ...items,
        {
          variantId: product.variantId,
          productName: product.productName,
          variantName: null,
          sku: product.sku,
          quantity: 1,
          unitPrice: product.salePrice,
          currentStock: product.currentStock,
        },
      ]);
      toast.success("Producto agregado");
    }
    setAddOpen(false);
    setProductSearch("");
    setSearchResults([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1">
                <Plus className="size-4" /> Agregar producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Agregar producto al presupuesto</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar por SKU o nombre…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchProducts()}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={searchProducts}
                    disabled={searching}
                  >
                    {searching ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                  </Button>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.variantId}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => addProduct(p)}
                    >
                      <div>
                        <p className="font-medium">{p.productName}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {p.sku} · Stock: {p.currentStock}
                        </p>
                      </div>
                      <span className="font-mono text-sm">
                        {formatPrice(p.salePrice)}
                      </span>
                    </button>
                  ))}
                  {!searching && searchResults.length === 0 && productSearch.length >= 2 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Sin resultados
                    </p>
                  ) : null}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Button type="button" onClick={() => void onSave()} disabled={saving || items.length === 0}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Guardar cambios
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-center">Cantidad</TableHead>
              <TableHead className="text-right">P. unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No hay productos. Agregá al menos uno para guardar.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.variantId}>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell>
                    {item.productName}
                    {item.variantName ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({item.variantName})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.currentStock != null ? (
                      <Badge
                        variant={
                          item.currentStock < item.quantity ? "destructive" : "outline"
                        }
                      >
                        {item.currentStock}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      className="mx-auto w-20 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.variantId, parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatPrice(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-semibold font-mono">
                    {formatPrice(lineSubtotal(item))}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar producto"
                      onClick={() => removeItem(item.variantId)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">Subtotal ítems</span>
            <span className="font-mono font-semibold">{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Al guardar se recalcula el descuento del cliente (si aplica) sobre este subtotal.
          </p>
        </div>
      </div>
    </div>
  );
}
