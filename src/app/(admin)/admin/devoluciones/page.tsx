"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Printer,
  Search,
  Undo2,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  COUNTER_PAYMENT_OPTIONS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type CounterPaymentMethod,
  type OrderStatus,
} from "@/lib/constants";
import { computeLineRefundAmount } from "@/lib/order-return-refund";
import { printOrderReturn } from "@/lib/return-print";
import { formatPrice } from "@/lib/utils";

type ReturnableItem = {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  quantityReturned: number;
  returnableQuantity: number;
  unitPrice: number;
  subtotal: number;
  maxRefundAmount: number;
};

type ReturnableOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  total: number;
  createdAt: string;
  items: ReturnableItem[];
};

type ReturnListItem = {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  refundMethod: string;
  total: number;
  itemCount: number;
  processedByName: string | null;
  createdAt: string;
};

type CompletedReturn = {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  refundMethod: string;
  subtotal: number;
  total: number;
  notes: string | null;
  processedByName: string | null;
  createdAt: string;
  items: {
    productName: string;
    variantName: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

const STORE_KEYS =
  "store_name,store_address,google_maps_address,whatsapp_number,contact_email";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function DevolucionesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetOrderId = searchParams.get("orderId");

  const [tab, setTab] = useState(presetOrderId ? "nueva" : "nueva");
  const [step, setStep] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ReturnableOrder[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<ReturnableOrder | null>(null);
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { checked: boolean; quantity: number }>
  >({});

  const [refundMethod, setRefundMethod] =
    useState<CounterPaymentMethod>("COUNTER_CASH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [completedReturn, setCompletedReturn] = useState<CompletedReturn | null>(
    null,
  );
  const [store, setStore] = useState<Record<string, string>>({});

  const [history, setHistory] = useState<ReturnListItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historyAmountFrom, setHistoryAmountFrom] = useState("");
  const [historyAmountTo, setHistoryAmountTo] = useState("");
  const [historyFilterError, setHistoryFilterError] = useState<string | null>(
    null,
  );

  const loadOrder = useCallback(async (orderId: string) => {
    setError(null);
    const res = await fetch(`/api/admin/returns/orders/${orderId}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "No se pudo cargar la venta.");
    }
    return data.order as ReturnableOrder;
  }, []);

  useEffect(() => {
    fetch(`/api/settings/public?keys=${STORE_KEYS}`)
      .then((r) => r.json())
      .then((d) => setStore(d.settings || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!presetOrderId) return;
    loadOrder(presetOrderId)
      .then((order) => {
        setSelectedOrder(order);
        setStep(2);
        const initial: Record<string, { checked: boolean; quantity: number }> =
          {};
        for (const item of order.items) {
          if (item.returnableQuantity > 0) {
            initial[item.id] = { checked: false, quantity: 1 };
          }
        }
        setSelectedItems(initial);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [presetOrderId, loadOrder]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryFilterError(null);
    try {
      const amountFrom = historyAmountFrom.trim()
        ? Number(historyAmountFrom.replace(",", "."))
        : undefined;
      const amountTo = historyAmountTo.trim()
        ? Number(historyAmountTo.replace(",", "."))
        : undefined;

      if (
        (amountFrom != null && !Number.isFinite(amountFrom)) ||
        (amountTo != null && !Number.isFinite(amountTo))
      ) {
        setHistoryFilterError("Ingresá montos válidos.");
        return;
      }

      if (
        amountFrom != null &&
        amountTo != null &&
        amountFrom > amountTo
      ) {
        setHistoryFilterError(
          "El monto desde no puede ser mayor al monto hasta.",
        );
        return;
      }

      const params = new URLSearchParams({ limit: "30" });
      if (historySearch.trim()) params.set("search", historySearch.trim());
      if (historyDateFrom) params.set("dateFrom", historyDateFrom);
      if (historyDateTo) params.set("dateTo", historyDateTo);
      if (amountFrom != null) params.set("amountFrom", String(amountFrom));
      if (amountTo != null) params.set("amountTo", String(amountTo));

      const res = await fetch(`/api/admin/returns?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setHistoryFilterError(data.error || "No se pudo cargar el historial.");
        setHistory([]);
        setHistoryTotal(0);
        return;
      }
      setHistory(data.items || []);
      setHistoryTotal(data.total ?? 0);
    } finally {
      setHistoryLoading(false);
    }
  }, [
    historySearch,
    historyDateFrom,
    historyDateTo,
    historyAmountFrom,
    historyAmountTo,
  ]);

  useEffect(() => {
    if (tab === "historial") void loadHistory();
    // Solo al abrir la pestaña; el resto se aplica con el botón.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function clearHistoryFilters() {
    setHistorySearch("");
    setHistoryDateFrom("");
    setHistoryDateTo("");
    setHistoryAmountFrom("");
    setHistoryAmountTo("");
    setHistoryFilterError(null);
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/returns?limit=30");
      const data = await res.json();
      if (res.ok) {
        setHistory(data.items || []);
        setHistoryTotal(data.total ?? 0);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSearch() {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/returns/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en la búsqueda.");
      setSearchResults(data.orders || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en la búsqueda.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function selectOrder(order: ReturnableOrder) {
    setSelectedOrder(order);
    const initial: Record<string, { checked: boolean; quantity: number }> = {};
    for (const item of order.items) {
      if (item.returnableQuantity > 0) {
        initial[item.id] = { checked: false, quantity: 1 };
      }
    }
    setSelectedItems(initial);
    setStep(2);
  }

  function resetWizard() {
    setStep(1);
    setSelectedOrder(null);
    setSelectedItems({});
    setSearchQuery("");
    setSearchResults([]);
    setRefundMethod("COUNTER_CASH");
    setNotes("");
    setCompletedReturn(null);
    setError(null);
    if (presetOrderId) {
      router.replace("/admin/devoluciones");
    }
  }

  const refundPreview = useMemo(() => {
    if (!selectedOrder) return { lines: [], total: 0 };
    const lines: { item: ReturnableItem; quantity: number; amount: number }[] =
      [];
    let total = 0;
    for (const item of selectedOrder.items) {
      const sel = selectedItems[item.id];
      if (!sel?.checked || sel.quantity <= 0) continue;
      const amount = computeLineRefundAmount(
        item.subtotal,
        item.quantity,
        sel.quantity,
        selectedOrder.subtotal,
        selectedOrder.total,
      );
      lines.push({ item, quantity: sel.quantity, amount });
      total += amount;
    }
    return { lines, total: Math.round(total * 100) / 100 };
  }, [selectedOrder, selectedItems]);

  async function handleConfirm() {
    if (!selectedOrder || refundPreview.lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          refundMethod,
          notes: notes.trim() || undefined,
          items: refundPreview.lines.map((l) => ({
            orderItemId: l.item.id,
            quantity: l.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar la devolución.");
      }
      setCompletedReturn(data.return);
      setStep(4);
      if (tab === "historial") void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al confirmar.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint() {
    if (!completedReturn) return;
    printOrderReturn(
      {
        returnNumber: completedReturn.returnNumber,
        orderNumber: completedReturn.orderNumber,
        refundMethod: completedReturn.refundMethod,
        subtotal: completedReturn.subtotal,
        total: completedReturn.total,
        createdAt: completedReturn.createdAt,
        processedByName: completedReturn.processedByName,
        notes: completedReturn.notes,
        items: completedReturn.items,
      },
      store,
    );
  }

  async function reprintFromHistory(id: string) {
    const res = await fetch(`/api/admin/returns/${id}`);
    const data = await res.json();
    if (!res.ok || !data.return) return;
    const r = data.return;
    printOrderReturn(
      {
        returnNumber: r.returnNumber,
        orderNumber: r.orderNumber,
        refundMethod: r.refundMethod,
        subtotal: r.subtotal,
        total: r.total,
        createdAt: r.createdAt,
        processedByName: r.processedByName,
        notes: r.notes,
        items: r.items,
      },
      store,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Devoluciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buscar ventas, registrar devoluciones parciales o totales y reintegrar
          al cliente.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="nueva">Nueva devolución</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="nueva" className="mt-4 space-y-4">
          {step < 4 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {[
                { n: 1, label: "Buscar venta" },
                { n: 2, label: "Productos" },
                { n: 3, label: "Reintegro" },
              ].map((s, i) => (
                <span key={s.n} className="flex items-center gap-2">
                  {i > 0 && <span>→</span>}
                  <Badge
                    variant={step === s.n ? "default" : "outline"}
                    className="font-normal"
                  >
                    {s.n}. {s.label}
                  </Badge>
                </span>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Buscar venta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Número de pedido, SKU, nombre del cliente, teléfono o producto.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Ej: FER-2026, 12345, Juan, codo 90..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Buscar
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="divide-y rounded-md border">
                    {searchResults.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => selectOrder(order)}
                        className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.customerName || "Sin nombre"} ·{" "}
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">
                            {formatPrice(order.total)}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {ORDER_STATUS_LABELS[order.status as OrderStatus] ??
                              order.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-sm text-muted-foreground">
                    Sin resultados. Probá con otro criterio.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {step === 2 && selectedOrder && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Venta {selectedOrder.orderNumber}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedOrder.customerName || "Sin nombre"} ·{" "}
                    {formatDate(selectedOrder.createdAt)} ·{" "}
                    {PAYMENT_METHOD_LABELS[
                      selectedOrder.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS
                    ] || selectedOrder.paymentMethod}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" />
                  Cambiar venta
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Vendido</TableHead>
                      <TableHead className="text-right">Ya devuelto</TableHead>
                      <TableHead className="text-right">A devolver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => {
                      const sel = selectedItems[item.id];
                      const disabled = item.returnableQuantity <= 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={sel?.checked ?? false}
                              disabled={disabled}
                              onCheckedChange={(checked) => {
                                setSelectedItems((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    checked: !!checked,
                                    quantity:
                                      prev[item.id]?.quantity ||
                                      Math.min(1, item.returnableQuantity),
                                  },
                                }));
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.productName}</div>
                            {item.variantName && (
                              <div className="text-xs text-muted-foreground">
                                {item.variantName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.sku || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantityReturned}
                          </TableCell>
                          <TableCell className="text-right">
                            {disabled ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <Input
                                type="number"
                                min={1}
                                max={item.returnableQuantity}
                                className="ml-auto w-20 text-right"
                                value={sel?.quantity ?? 1}
                                disabled={!sel?.checked}
                                onChange={(e) => {
                                  const qty = Math.min(
                                    item.returnableQuantity,
                                    Math.max(1, Number(e.target.value) || 1),
                                  );
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      checked: prev[item.id]?.checked ?? false,
                                      quantity: qty,
                                    },
                                  }));
                                }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="size-4" />
                    Atrás
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={refundPreview.lines.length === 0}
                  >
                    Continuar
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && selectedOrder && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Confirmar reintegro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Reintegro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refundPreview.lines.map((line) => (
                      <TableRow key={line.item.id}>
                        <TableCell>{line.item.productName}</TableCell>
                        <TableCell className="text-right">
                          {line.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(line.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Forma de reintegro</Label>
                    <Select
                      value={refundMethod}
                      onValueChange={(v) =>
                        setRefundMethod(v as CounterPaymentMethod)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTER_PAYMENT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end justify-end">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Total a reintegrar
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(refundPreview.total)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    placeholder="Motivo, observaciones..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="size-4" />
                    Atrás
                  </Button>
                  <Button onClick={handleConfirm} disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Undo2 className="size-4" />
                    )}
                    Confirmar devolución
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && completedReturn && (
            <Card className="border-emerald-200">
              <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                <CheckCircle2 className="size-14 text-emerald-600" />
                <div>
                  <h2 className="text-xl font-semibold">Devolución registrada</h2>
                  <p className="mt-1 text-muted-foreground">
                    {completedReturn.returnNumber} · Venta{" "}
                    {completedReturn.orderNumber}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-primary">
                    {formatPrice(completedReturn.total)}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={handlePrint}>
                    <Printer className="size-4" />
                    Imprimir comprobante
                  </Button>
                  <Button variant="outline" onClick={resetWizard}>
                    Nueva devolución
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/admin/pedidos/${completedReturn.orderId}`}>
                      Ver venta origen
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de devoluciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2 xl:col-span-3">
                  <Label htmlFor="history-search">Buscar</Label>
                  <Input
                    id="history-search"
                    placeholder="Nº devolución, nº venta u operador..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadHistory()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history-date-from">Fecha desde</Label>
                  <Input
                    id="history-date-from"
                    type="date"
                    value={historyDateFrom}
                    onChange={(e) => setHistoryDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history-date-to">Fecha hasta</Label>
                  <Input
                    id="history-date-to"
                    type="date"
                    value={historyDateTo}
                    onChange={(e) => setHistoryDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history-amount-from">Monto desde</Label>
                  <Input
                    id="history-amount-from"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    value={historyAmountFrom}
                    onChange={(e) => setHistoryAmountFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history-amount-to">Monto hasta</Label>
                  <Input
                    id="history-amount-to"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    value={historyAmountTo}
                    onChange={(e) => setHistoryAmountTo(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-3">
                  <Button onClick={loadHistory} disabled={historyLoading}>
                    {historyLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Aplicar filtros
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearHistoryFilters}
                    disabled={historyLoading}
                  >
                    Limpiar
                  </Button>
                  {!historyLoading && historyTotal > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {historyTotal} resultado{historyTotal === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>

              {historyFilterError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {historyFilterError}
                </div>
              )}

              {historyLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay devoluciones con esos filtros.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Devolución</TableHead>
                      <TableHead>Venta</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Reintegro</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.returnNumber}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/pedidos/${row.orderId}`}
                            className="text-primary hover:underline"
                          >
                            {row.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{row.customerName || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {PAYMENT_METHOD_LABELS[
                            row.refundMethod as keyof typeof PAYMENT_METHOD_LABELS
                          ] || row.refundMethod}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(row.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reprintFromHistory(row.id)}
                          >
                            <Printer className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DevolucionesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DevolucionesContent />
    </Suspense>
  );
}
