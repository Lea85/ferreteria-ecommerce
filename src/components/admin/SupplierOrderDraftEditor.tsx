"use client";

import { Loader2, Plus, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupplierOrderMarginCell } from "@/components/admin/SupplierOrderMarginCell";
import { parsePriceInput, roundPrice } from "@/lib/supplier-order-pricing";

export type SupplierOrderDraftItem = {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string;
  requestedQty: number;
  currentStock: number;
  costPrice: number;
  salePrice: number;
};

type SearchProduct = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  suggestedQty: number;
  costPrice: number;
  salePrice: number;
};

type SupplierOrderDraftEditorProps = {
  orderId: string;
  supplierId: string | null;
  items: SupplierOrderDraftItem[];
  onSaved: (items: SupplierOrderDraftItem[]) => void;
  onItemsChange?: (items: SupplierOrderDraftItem[]) => void;
  headerActions?: React.ReactNode;
};

function tempId(variantId: string) {
  return `temp-${variantId}`;
}

function isTempId(id: string) {
  return id.startsWith("temp-");
}

function sameDraftItems(
  a: SupplierOrderDraftItem[],
  b: SupplierOrderDraftItem[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.productId !== y.productId ||
      x.variantId !== y.variantId ||
      x.requestedQty !== y.requestedQty ||
      x.costPrice !== y.costPrice ||
      x.salePrice !== y.salePrice ||
      x.currentStock !== y.currentStock ||
      x.sku !== y.sku ||
      x.productName !== y.productName
    ) {
      return false;
    }
  }
  return true;
}

export function SupplierOrderDraftEditor({
  orderId,
  supplierId,
  items,
  onSaved,
  onItemsChange,
  headerActions,
}: SupplierOrderDraftEditorProps) {
  const [draftItems, setDraftItems] = useState<SupplierOrderDraftItem[]>(items);
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);

  // Solo sincroniza si el contenido cambió de verdad. Evita un loop de
  // re-renders cuando el padre recrea el array `items` en cada render.
  useEffect(() => {
    setDraftItems((prev) => (sameDraftItems(prev, items) ? prev : items));
    setRemovedItemIds((prev) => (prev.length === 0 ? prev : []));
  }, [items, orderId]);

  useEffect(() => {
    onItemsChange?.(draftItems);
  }, [draftItems, onItemsChange]);

  function updateRequestedQty(itemId: string, value: number) {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, requestedQty: Math.max(1, Math.floor(value) || 1) }
          : item,
      ),
    );
  }

  function updateCostPrice(itemId: string, value: string) {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, costPrice: roundPrice(parsePriceInput(value)) }
          : item,
      ),
    );
  }

  function updateSalePrice(itemId: string, value: string) {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, salePrice: roundPrice(parsePriceInput(value)) }
          : item,
      ),
    );
  }

  function removeItem(itemId: string) {
    setDraftItems((prev) => prev.filter((item) => item.id !== itemId));
    if (!isTempId(itemId)) {
      setRemovedItemIds((prev) =>
        prev.includes(itemId) ? prev : [...prev, itemId],
      );
    }
  }

  async function searchProducts() {
    const q = productSearch.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({ q });
      if (supplierId) params.set("supplierId", supplierId);
      const res = await fetch(
        `/api/admin/supplier-orders/search-products?${params}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en la búsqueda");
      setSearchResults(data.products || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al buscar productos");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function addProduct(product: SearchProduct) {
    const exists = draftItems.some((i) => i.variantId === product.variantId);
    if (exists) {
      toast.error("Ese producto ya está en el pedido.");
      return;
    }

    setDraftItems((prev) => [
      ...prev,
      {
        id: tempId(product.variantId),
        productId: product.productId,
        variantId: product.variantId,
        productName: product.productName,
        sku: product.sku,
        requestedQty: Math.max(1, product.suggestedQty),
        currentStock: product.currentStock,
        costPrice: product.costPrice,
        salePrice: product.salePrice,
      },
    ]);
    setAddOpen(false);
    setProductSearch("");
    setSearchResults([]);
    toast.success(`${product.productName} agregado al pedido`);
  }

  async function handleSave() {
    if (draftItems.length === 0) {
      toast.error("El pedido debe tener al menos un producto.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/supplier-orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          items: draftItems.map((item) => ({
            ...(isTempId(item.id)
              ? { variantId: item.variantId }
              : { id: item.id }),
            requestedQty: item.requestedQty,
            costPrice: item.costPrice,
            salePrice: item.salePrice,
          })),
          removeItemIds: removedItemIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      const savedItems: SupplierOrderDraftItem[] = (data.order?.items || []).map(
        (item: SupplierOrderDraftItem) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: item.sku,
          requestedQty: item.requestedQty,
          currentStock: item.currentStock,
          costPrice: item.costPrice,
          salePrice: item.salePrice,
        }),
      );

      setDraftItems(savedItems);
      setRemovedItemIds([]);
      onSaved(savedItems);
      toast.success("Pedido guardado correctamente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 size-4" />
                Agregar producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Agregar producto al pedido</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buscar por nombre o SKU</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: codo, LATYN, 12345..."
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
                  {supplierId && (
                    <p className="text-xs text-muted-foreground">
                      Mostrando productos del proveedor seleccionado.
                    </p>
                  )}
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {productSearch.trim().length >= 2
                        ? "Sin resultados"
                        : "Escribí al menos 2 caracteres para buscar"}
                    </p>
                  ) : (
                    searchResults.map((product) => (
                      <button
                        key={product.variantId}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {product.sku} · stock {product.currentStock}
                          </p>
                        </div>
                        <Plus className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Guardar pedido
          </Button>
        </div>
        {headerActions}
      </div>

      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-center">Stock actual</TableHead>
              <TableHead className="text-center">Solicitado</TableHead>
              <TableHead className="text-center">P. compra</TableHead>
              <TableHead className="text-center">P. venta</TableHead>
              <TableHead className="text-center">% ganancia</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {draftItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  No hay productos en el pedido
                </TableCell>
              </TableRow>
            ) : (
              draftItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        item.currentStock === 0 ? "destructive" : "outline"
                      }
                    >
                      {item.currentStock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={1}
                      className="mx-auto w-20 text-center"
                      value={item.requestedQty}
                      onChange={(e) =>
                        updateRequestedQty(
                          item.id,
                          parseInt(e.target.value, 10) || 1,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="mx-auto w-24 text-center"
                      value={item.costPrice}
                      onChange={(e) => updateCostPrice(item.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="mx-auto w-24 text-center"
                      value={item.salePrice}
                      onChange={(e) => updateSalePrice(item.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <SupplierOrderMarginCell
                      costPrice={item.costPrice}
                      salePrice={item.salePrice}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
