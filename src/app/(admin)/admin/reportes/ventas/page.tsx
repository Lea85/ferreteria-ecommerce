"use client";

import {
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Globe,
  Loader2,
  Package,
  PackageMinus,
  ShoppingCart,
  Store,
  Tags,
  TrendingDown,
  Percent,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  currentYearMonthArgentina,
  formatMonthLabel,
  todayIsoArgentina,
} from "@/lib/sales-report-period";
import { downloadFileFromResponse } from "@/lib/spreadsheet-download";
import { formatPrice } from "@/lib/utils";

type Period = "day" | "7d" | "15d" | "30d" | "ytd" | "month";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Hoy" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "15d", label: "Ultimos 15 dias" },
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "month", label: "Mes" },
  { value: "ytd", label: "Desde inicio del año" },
];

type ProductRow = { name: string; sku: string; units: number; revenue: number };
type StockRow = { name: string; sku: string; stock: number };
type CatRow = { name: string; orders: number; revenue: number; pct: number };

type ChannelMetrics = { revenue: number; orders: number; avgTicket: number };

type ReportData = {
  monthStatus?: "past" | "in_progress" | "future";
  statusMessage?: string;
  metrics: {
    totalRevenue: number;
    grossRevenue?: number;
    returnsRevenue?: number;
    totalProfit: number;
    totalOrders: number;
    totalReturns?: number;
    avgTicket: number;
  };
  channelBreakdown: {
    counter: ChannelMetrics;
    web: ChannelMetrics;
    mercadolibre: ChannelMetrics;
  };
  topProducts: ProductRow[];
  leastSold: ProductRow[];
  mostStock: StockRow[];
  leastStock: StockRow[];
  topCategories: CatRow[];
  periodLabel?: string;
};

function defaultMonthValue() {
  const { year, month } = currentYearMonthArgentina();
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildReportParams(
  period: Period,
  selectedDate: string,
  selectedMonth: string,
) {
  const params = new URLSearchParams({ period });
  if (period === "day") params.set("date", selectedDate);
  if (period === "month") params.set("month", selectedMonth);
  return params;
}

export default function AnalisisVentasPage() {
  const [period, setPeriod] = useState<Period>("day");
  const [selectedDate, setSelectedDate] = useState(todayIsoArgentina);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthValue);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const warnedMonthRef = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = buildReportParams(period, selectedDate, selectedMonth);
    fetch(`/api/admin/reports/ventas?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period, selectedDate, selectedMonth]);

  useEffect(() => {
    if (data?.monthStatus !== "in_progress" || !data.periodLabel) return;
    if (warnedMonthRef.current === data.periodLabel) return;
    warnedMonthRef.current = data.periodLabel;
    toast.warning(
      data.statusMessage ||
        "El mes seleccionado aún está en curso. Los datos mostrados corresponden hasta hoy.",
      { duration: 8000 },
    );
  }, [data?.monthStatus, data?.periodLabel, data?.statusMessage]);

  async function handleExport() {
    if (data?.monthStatus === "future") {
      toast.error("Aún no hay datos para este mes.");
      return;
    }

    setExporting(true);
    try {
      const params = buildReportParams(period, selectedDate, selectedMonth);
      const res = await fetch(
        `/api/admin/reports/ventas/export?${params.toString()}`,
      );
      const fallback = `reporte_ventas_${data?.periodLabel ?? period}.xlsx`;
      await downloadFileFromResponse(res, fallback);
      toast.success("Excel descargado correctamente");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al generar el Excel",
      );
    } finally {
      setExporting(false);
    }
  }

  function handlePeriodChange(value: Period) {
    setPeriod(value);
    if (value === "day") {
      setSelectedDate(todayIsoArgentina());
    }
    if (value === "month") {
      setSelectedMonth(defaultMonthValue());
      warnedMonthRef.current = null;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFutureMonth = data?.monthStatus === "future";

  const m = data?.metrics || {
    totalRevenue: 0,
    grossRevenue: 0,
    returnsRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    totalReturns: 0,
    avgTicket: 0,
  };
  const channels = data?.channelBreakdown || {
    counter: { revenue: 0, orders: 0, avgTicket: 0 },
    web: { revenue: 0, orders: 0, avgTicket: 0 },
    mercadolibre: { revenue: 0, orders: 0, avgTicket: 0 },
  };
  const topProducts = data?.topProducts || [];
  const leastSold = data?.leastSold || [];
  const mostStock = data?.mostStock || [];
  const leastStock = data?.leastStock || [];
  const topCategories = data?.topCategories || [];

  const hasData =
    !isFutureMonth &&
    (m.totalOrders > 0 || channels.mercadolibre.orders > 0);

  const monthLabel =
    period === "month" && data?.periodLabel
      ? formatMonthLabel(
          Number(data.periodLabel.slice(0, 4)),
          Number(data.periodLabel.slice(5, 7)),
        )
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analisis de ventas</h1>
          <p className="text-sm text-muted-foreground">
            Metricas calculadas en base a pedidos reales. Las ventas por
            MercadoLibre se muestran por separado y no afectan ventas ni ganancia
            total.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-border"
              disabled={exporting || isFutureMonth}
              onClick={() => void handleExport()}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
              {exporting ? "Generando Excel…" : "Descargar Excel"}
            </Button>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Periodo</Label>
              <Select
                value={period}
                onValueChange={(v) => handlePeriodChange(v as Period)}
              >
                <SelectTrigger className="w-full min-w-[220px] border-border sm:w-56">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {period === "day" && (
            <div className="space-y-1.5">
              <Label htmlFor="report-date" className="text-xs text-muted-foreground">
                Otra fecha
              </Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="report-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full min-w-[220px] border-border pl-9 sm:w-56"
                />
              </div>
            </div>
          )}
          {period === "month" && (
            <div className="space-y-1.5">
              <Label htmlFor="report-month" className="text-xs text-muted-foreground">
                Mes a analizar
              </Label>
              <Input
                id="report-month"
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  warnedMonthRef.current = null;
                }}
                className="w-full min-w-[220px] border-border sm:w-56"
              />
            </div>
          )}
        </div>
      </div>

      {period === "day" && data?.periodLabel && (
        <p className="text-sm text-muted-foreground">
          Mostrando ventas del día{" "}
          <span className="font-medium text-foreground">
            {new Date(`${data.periodLabel}T12:00:00`).toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </p>
      )}

      {period === "month" && monthLabel && !isFutureMonth && (
        <p className="text-sm text-muted-foreground">
          Mostrando ventas de{" "}
          <span className="font-medium text-foreground">{monthLabel}</span>
          {data?.monthStatus === "in_progress"
            ? " (mes en curso, hasta hoy)"
            : ""}
        </p>
      )}

      {isFutureMonth && (
        <Card className="border-dashed border-amber-300 bg-amber-50/50">
          <CardContent className="py-8 text-center text-amber-800">
            <Calendar className="mx-auto mb-3 size-10 text-amber-400" />
            <p className="font-semibold">Aún no hay datos para este mes</p>
            <p className="mt-1 text-sm">
              {monthLabel
                ? `${monthLabel} todavía no comenzó. Elegí un mes anterior para ver resultados.`
                : "El mes seleccionado todavía no comenzó."}
            </p>
          </CardContent>
        </Card>
      )}

      {!isFutureMonth && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: "Ventas netas",
                value: formatPrice(m.totalRevenue),
                icon: DollarSign,
                color: "text-emerald-600",
              },
              {
                label: "Devoluciones",
                value: formatPrice(m.returnsRevenue ?? 0),
                icon: TrendingDown,
                color: "text-red-600",
              },
              {
                label: "Ganancia neta",
                value: formatPrice(m.totalProfit),
                icon: Percent,
                color: "text-teal-600",
              },
              {
                label: "Pedidos",
                value: m.totalOrders.toLocaleString("es-AR"),
                icon: ShoppingCart,
                color: "text-blue-600",
              },
              {
                label: "Ticket promedio",
                value: formatPrice(m.avgTicket),
                icon: TrendingUp,
                color: "text-violet-600",
              },
            ].map((k) => (
              <Card key={k.label} className="border-border shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted ${k.color}`}
                  >
                    <k.icon className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <p className="text-2xl font-bold text-foreground">{k.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Ventas por canal
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Store className="size-5 text-emerald-700" />
                    Mostrador
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Facturación</p>
                    <p className="text-xl font-bold text-emerald-800">
                      {formatPrice(channels.counter.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                    <p className="text-xl font-bold">{channels.counter.orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket prom.</p>
                    <p className="text-xl font-bold">
                      {formatPrice(channels.counter.avgTicket)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="size-5 text-blue-700" />
                    Sitio web
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Facturación</p>
                    <p className="text-xl font-bold text-blue-800">
                      {formatPrice(channels.web.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                    <p className="text-xl font-bold">{channels.web.orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket prom.</p>
                    <p className="text-xl font-bold">
                      {formatPrice(channels.web.avgTicket)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50/40 shadow-sm md:col-span-2 xl:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tags className="size-5 text-yellow-700" />
                    MercadoLibre
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Facturación</p>
                    <p className="text-xl font-bold text-yellow-800">
                      {formatPrice(channels.mercadolibre.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                    <p className="text-xl font-bold">{channels.mercadolibre.orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket prom.</p>
                    <p className="text-xl font-bold">
                      {formatPrice(channels.mercadolibre.avgTicket)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {!hasData && (
            <Card className="border-dashed border-amber-300 bg-amber-50/50">
              <CardContent className="py-8 text-center text-amber-800">
                <ShoppingCart className="mx-auto mb-3 size-10 text-amber-400" />
                <p className="font-semibold">No hay pedidos en el periodo seleccionado</p>
                <p className="mt-1 text-sm">
                  Los datos se calculan a partir de pedidos reales. Proba otro día o un
                  periodo mas amplio.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-5 text-emerald-600" />
                  Productos mas vendidos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>#</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Unid.</TableHead>
                      <TableHead className="text-right">Facturacion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-muted-foreground"
                        >
                          Sin datos
                        </TableCell>
                      </TableRow>
                    ) : (
                      topProducts.map((p, i) => (
                        <TableRow key={p.sku + i}>
                          <TableCell>
                            <Badge
                              variant={i < 3 ? "default" : "outline"}
                              className="size-7 justify-center rounded-full"
                            >
                              {i + 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.sku}
                          </TableCell>
                          <TableCell className="text-right">{p.units}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatPrice(p.revenue)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="size-5 text-red-500" />
                  Productos menos vendidos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Unid.</TableHead>
                      <TableHead className="text-right">Facturacion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leastSold.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-muted-foreground"
                        >
                          Sin datos
                        </TableCell>
                      </TableRow>
                    ) : (
                      leastSold.map((p, i) => (
                        <TableRow key={p.sku + i}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.sku}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={p.units === 0 ? "destructive" : "secondary"}>
                              {p.units}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(p.revenue)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Warehouse className="size-5 text-emerald-600" />
                  Productos con mayor stock
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mostStock.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-6 text-center text-muted-foreground"
                        >
                          Sin datos
                        </TableCell>
                      </TableRow>
                    ) : (
                      mostStock.map((p, i) => (
                        <TableRow key={p.sku + i}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.sku}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            {p.stock}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PackageMinus className="size-5 text-amber-600" />
                  Productos con menor stock
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leastStock.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-6 text-center text-muted-foreground"
                        >
                          Sin datos
                        </TableCell>
                      </TableRow>
                    ) : (
                      leastStock.map((p, i) => (
                        <TableRow key={p.sku + i}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.sku}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={p.stock <= 1 ? "destructive" : "secondary"}
                              className="font-semibold"
                            >
                              {p.stock}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-5 text-primary" />
                Ventas por categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCategories.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                  Sin datos de categorias para este periodo.
                </p>
              ) : (
                <div className="space-y-3">
                  {topCategories.map((cat) => (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground">{cat.pct}%</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="h-2.5 flex-1 rounded-full bg-muted">
                          <div
                            className="h-2.5 rounded-full bg-primary transition-all"
                            style={{ width: `${cat.pct}%` }}
                          />
                        </div>
                        <span className="w-24 text-right text-xs text-muted-foreground">
                          {formatPrice(cat.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
