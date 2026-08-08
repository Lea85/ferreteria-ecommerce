"use client";

import {
  DollarSign,
  Loader2,
  Package,
  ShoppingCart,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { formatPrice } from "@/lib/utils";

type Period = "day" | "7d" | "15d" | "30d" | "ytd" | "month";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  SUPER_ADMIN: "Administrador",
  MOSTRADOR: "Mostrador",
};

function sellerRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Hoy" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "15d", label: "Ultimos 15 dias" },
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "month", label: "Mes" },
  { value: "ytd", label: "Desde inicio del año" },
];

type SellerRow = {
  userId: string | null;
  name: string;
  email: string | null;
  role: string;
  orderCount: number;
  unitsSold: number;
  revenue: number;
  avgTicket: number;
  mercadolibreOrders: number;
  mercadolibreRevenue: number;
};

type ReportData = {
  periodLabel?: string;
  monthStatus?: "past" | "in_progress" | "future";
  statusMessage?: string;
  summary: {
    sellers: number;
    totalOrders: number;
    totalUnits: number;
    totalRevenue: number;
  };
  byRevenue: SellerRow[];
  byUnits: SellerRow[];
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

function SellerTable({
  title,
  rows,
  mode,
}: {
  title: string;
  rows: SellerRow[];
  mode: "revenue" | "units";
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-5 text-amber-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">
                {mode === "revenue" ? "Facturacion" : "Unidades"}
              </TableHead>
              <TableHead className="text-right hidden md:table-cell">
                {mode === "revenue" ? "Unidades" : "Facturacion"}
              </TableHead>
              <TableHead className="text-right hidden lg:table-cell">
                Ticket prom.
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  Sin ventas de mostrador en este periodo
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={row.userId ?? `${row.name}-${i}`}>
                  <TableCell>
                    <span className="flex size-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{row.name}</p>
                    {row.email ? (
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {sellerRoleLabel(row.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {row.orderCount}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">
                    {mode === "revenue"
                      ? formatPrice(row.revenue)
                      : row.unitsSold.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm md:table-cell">
                    {mode === "revenue"
                      ? row.unitsSold.toLocaleString("es-AR")
                      : formatPrice(row.revenue)}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm lg:table-cell">
                    {formatPrice(row.avgTicket)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AnalisisVendedoresPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [selectedDate, setSelectedDate] = useState(todayIsoArgentina);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthValue);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const warnedMonthRef = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = buildReportParams(period, selectedDate, selectedMonth);
    fetch(`/api/admin/reports/vendedores?${params.toString()}`)
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

  function handlePeriodChange(value: Period) {
    setPeriod(value);
    if (value === "day") setSelectedDate(todayIsoArgentina());
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
  const s = data?.summary || {
    sellers: 0,
    totalOrders: 0,
    totalUnits: 0,
    totalRevenue: 0,
  };

  const monthLabel =
    period === "month" && data?.periodLabel
      ? (() => {
          const [y, m] = data.periodLabel.split("-").map(Number);
          return formatMonthLabel(y, m);
        })()
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Rendimiento de vendedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Ventas de mostrador por operador (administrador y mostrador).
            {monthLabel ? ` Periodo: ${monthLabel}.` : null}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Periodo</Label>
            <Select
              value={period}
              onValueChange={(v) => handlePeriodChange(v as Period)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {period === "day" ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <Input
                type="date"
                className="w-44"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          ) : null}

          {period === "month" ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mes</Label>
              <Input
                type="month"
                className="w-44"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  warnedMonthRef.current = null;
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {isFutureMonth ? (
        <Card className="border-dashed border-amber-300 bg-amber-50/50">
          <CardContent className="py-8 text-center text-amber-800">
            <p className="font-semibold">
              {data?.statusMessage || "Aún no hay datos para este mes."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <Users className="size-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.sellers}</p>
                  <p className="text-xs text-muted-foreground">Vendedores</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/10">
                  <ShoppingCart className="size-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Package className="size-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {s.totalUnits.toLocaleString("es-AR")}
                  </p>
                  <p className="text-xs text-muted-foreground">Unidades</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10">
                  <DollarSign className="size-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatPrice(s.totalRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">Facturacion</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <SellerTable
              title="Mas facturacion"
              rows={data?.byRevenue || []}
              mode="revenue"
            />
            <SellerTable
              title="Mas unidades vendidas"
              rows={data?.byUnits || []}
              mode="units"
            />
          </div>
        </>
      )}
    </div>
  );
}
