"use client";

import { ArrowLeft, Check, Loader2, Send, X } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrderItem = {
  id: string;
  productName: string;
  sku: string;
  requestedQty: number;
  receivedQty: number;
  currentStock: number;
  productId: string;
  variantId: string | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  notes: string | null;
  supplierName: string;
  items: OrderItem[];
  createdAt: string;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  PARTIALLY_RECEIVED: "Parcialmente recibido",
  RECEIVED: "Recibido",
  CANCELLED: "Cancelado",
};

export default function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/supplier-orders/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder(data.order);
      const qtys: Record<string, number> = {};
      for (const item of data.order.items) {
        qtys[item.id] = item.receivedQty;
      }
      setReceivedQtys(qtys);
    } catch {
      toast.error("Error al cargar pedido");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function handleReceive() {
    if (!order) return;
    setSaving(true);
    try {
      const items = order.items.map((item) => ({
        id: item.id,
        receivedQty: receivedQtys[item.id] ?? item.receivedQty,
      }));
      const res = await fetch(`/api/admin/supplier-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive", items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Recepción registrada. Stock actualizado.");
      fetchOrder();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al registrar recepción");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: string) {
    try {
      const res = await fetch(`/api/admin/supplier-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Estado actualizado a ${statusLabel[status] || status}`);
      fetchOrder();
    } catch {
      toast.error("Error al actualizar estado");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center text-muted-foreground">Pedido no encontrado</div>
    );
  }

  const isEditable = order.status !== "RECEIVED" && order.status !== "CANCELLED";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/proveedores" className="hover:underline">
          Proveedores
        </Link>
        <span>/</span>
        <Link href="/admin/proveedores/pedidos" className="hover:underline">
          Pedidos
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{order.orderNumber}</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedido {order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Proveedor: {order.supplierName} &bull;{" "}
            {new Date(order.createdAt).toLocaleDateString("es-AR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {statusLabel[order.status] || order.status}
          </Badge>
          {isEditable && (
            <>
              {order.status === "DRAFT" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus("SENT")}
                >
                  <Send className="mr-1 size-4" /> Marcar enviado
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm("¿Cancelar este pedido?")) changeStatus("CANCELLED");
                }}
              >
                <X className="mr-1 size-4" /> Cancelar pedido
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-center">Stock actual</TableHead>
              <TableHead className="text-center">Solicitado</TableHead>
              <TableHead className="text-center">Recibido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.productName}</TableCell>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell className="text-center">{item.currentStock}</TableCell>
                <TableCell className="text-center font-semibold">
                  {item.requestedQty}
                </TableCell>
                <TableCell className="text-center">
                  {isEditable ? (
                    <Input
                      type="number"
                      min={0}
                      className="mx-auto w-20 text-center"
                      value={receivedQtys[item.id] ?? 0}
                      onChange={(e) =>
                        setReceivedQtys((prev) => ({
                          ...prev,
                          [item.id]: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                    />
                  ) : (
                    <span
                      className={
                        item.receivedQty >= item.requestedQty
                          ? "text-green-600 font-semibold"
                          : "text-amber-600"
                      }
                    >
                      {item.receivedQty}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isEditable && (
        <div className="flex gap-2">
          <Button onClick={handleReceive} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Check className="mr-2 size-4" />
            )}
            Registrar recepción
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/proveedores/pedidos">
              <ArrowLeft className="mr-2 size-4" /> Volver a pedidos
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
