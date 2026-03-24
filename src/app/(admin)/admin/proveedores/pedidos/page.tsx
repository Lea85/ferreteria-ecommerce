"use client";

import { Download, Loader2, Package, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SupplierOption = { id: string; name: string };

type OrderItem = {
  id: string;
  productName: string;
  sku: string;
  requestedQty: number;
  currentStock: number;
};

type GeneratedOrder = {
  id: string;
  orderNumber: string;
  supplierName: string;
  items: OrderItem[];
  createdAt: string;
};

type OrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  supplierName: string;
  itemCount: number;
  createdAt: string;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  PARTIALLY_RECEIVED: "Parcial",
  RECEIVED: "Recibido",
  CANCELLED: "Cancelado",
};

const statusVariant: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  DRAFT: "outline",
  SENT: "secondary",
  PARTIALLY_RECEIVED: "default",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

export default function PedidosProveedoresPage() {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [generating, setGenerating] = useState(false);
  const [generatedOrder, setGeneratedOrder] = useState<GeneratedOrder | null>(null);

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(0);

  useEffect(() => {
    fetch("/api/admin/suppliers?limit=200")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.suppliers || []))
      .catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(orderPage), limit: "15" });
      const res = await fetch(`/api/admin/supplier-orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setOrderTotalPages(data.totalPages || 0);
    } catch {
      toast.error("Error al cargar pedidos");
    } finally {
      setOrdersLoading(false);
    }
  }, [orderPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleGenerate() {
    setGenerating(true);
    setGeneratedOrder(null);
    try {
      const res = await fetch("/api/admin/supplier-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier === "all" ? null : selectedSupplier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setGeneratedOrder(data.order);
      toast.success(`Pedido ${data.order.orderNumber} generado con ${data.order.items.length} items`);
      fetchOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al generar pedido");
    } finally {
      setGenerating(false);
    }
  }

  function downloadCSV() {
    if (!generatedOrder) return;
    const BOM = "\uFEFF";
    const header = "Producto,SKU,Stock Actual,Cantidad Solicitada";
    const rows = generatedOrder.items.map(
      (i) => `"${i.productName}","${i.sku}",${i.currentStock},${i.requestedQty}`,
    );
    const csv = BOM + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedOrder.orderNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pedidos a proveedores</h1>

      <Tabs defaultValue="generar">
        <TabsList>
          <TabsTrigger value="generar">
            <Plus className="mr-2 size-4" /> Generar pedido
          </TabsTrigger>
          <TabsTrigger value="historial">
            <Package className="mr-2 size-4" /> Historial de pedidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generar" className="space-y-6 pt-4">
          <div className="rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Generar pedido de reposición</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              El sistema generará un listado con todos los productos cuyo stock actual sea
              inferior al mínimo configurado.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Proveedor</label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proveedores</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Generar pedido de reposición
              </Button>
            </div>
          </div>

          {generatedOrder && (
            <div className="space-y-4 rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Pedido {generatedOrder.orderNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Proveedor: {generatedOrder.supplierName} &bull;{" "}
                    {generatedOrder.items.length} items
                  </p>
                </div>
                <Button variant="outline" onClick={downloadCSV}>
                  <Download className="mr-2 size-4" /> Descargar CSV
                </Button>
              </div>

              <div className="overflow-x-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-center">Stock actual</TableHead>
                      <TableHead className="text-center">Solicitado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.currentStock === 0 ? "destructive" : "outline"}>
                            {item.currentStock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {item.requestedQty}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="historial" className="space-y-4 pt-4">
          {ordersLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No hay pedidos registrados
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nro Pedido</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono font-medium">
                          {o.orderNumber}
                        </TableCell>
                        <TableCell>{o.supplierName}</TableCell>
                        <TableCell className="text-center">{o.itemCount}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusVariant[o.status] || "outline"}>
                            {statusLabel[o.status] || o.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(o.createdAt).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/proveedores/pedidos/${o.id}`}>
                              Ver detalle
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {orderTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={orderPage <= 1}
                    onClick={() => setOrderPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {orderPage} de {orderTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={orderPage >= orderTotalPages}
                    onClick={() => setOrderPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
