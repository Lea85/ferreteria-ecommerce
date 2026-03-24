"use client";

import { Clock, DollarSign, ShoppingCart, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

type Period = "7d" | "1m" | "6m" | "1y" | "ytd";

const PERIODS = [
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "1m", label: "Ultimo mes" },
  { value: "6m", label: "Ultimos 6 meses" },
  { value: "1y", label: "Ultimo año" },
  { value: "ytd", label: "YTD" },
];

function scaleVal(base: number, period: Period): number {
  const f: Record<Period, number> = { "7d": 0.23, "1m": 1, "6m": 5.5, "1y": 11, "ytd": 3.2 };
  return Math.round(base * f[period]);
}
function scaleTime(baseMin: number, period: Period): string {
  const f: Record<Period, number> = { "7d": 0.3, "1m": 1, "6m": 3, "1y": 6, "ytd": 2.5 };
  const total = Math.round(baseMin * f[period]);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type ClientRow = {
  id: string; name: string; email: string; customerType: string;
  sessionMinutes: number; itemsBought: number; totalSpent: number;
};

const MOCK_CLIENTS: ClientRow[] = [
  { id: "u1", name: "Carlos Mendez", email: "carlos@email.com", customerType: "TRADE", sessionMinutes: 245, itemsBought: 87, totalSpent: 1250000 },
  { id: "u2", name: "Maria Garcia", email: "maria@email.com", customerType: "CONSUMER", sessionMinutes: 180, itemsBought: 45, totalSpent: 890000 },
  { id: "u3", name: "Roberto Silva", email: "roberto@email.com", customerType: "WHOLESALE", sessionMinutes: 320, itemsBought: 156, totalSpent: 3450000 },
  { id: "u4", name: "Ana Lopez", email: "ana@email.com", customerType: "CONSUMER", sessionMinutes: 95, itemsBought: 12, totalSpent: 245000 },
  { id: "u5", name: "Diego Fernandez", email: "diego@email.com", customerType: "TRADE", sessionMinutes: 210, itemsBought: 68, totalSpent: 1780000 },
  { id: "u6", name: "Laura Martinez", email: "laura@email.com", customerType: "CONSUMER", sessionMinutes: 45, itemsBought: 5, totalSpent: 78000 },
  { id: "u7", name: "Juan Perez", email: "juan@email.com", customerType: "TRADE", sessionMinutes: 155, itemsBought: 34, totalSpent: 920000 },
  { id: "u8", name: "Lucia Romero", email: "lucia@email.com", customerType: "CONSUMER", sessionMinutes: 30, itemsBought: 3, totalSpent: 42000 },
  { id: "u9", name: "Martin Torres", email: "martin@email.com", customerType: "WHOLESALE", sessionMinutes: 280, itemsBought: 120, totalSpent: 2800000 },
  { id: "u10", name: "Sofia Gutierrez", email: "sofia@email.com", customerType: "CONSUMER", sessionMinutes: 65, itemsBought: 8, totalSpent: 156000 },
];

const TYPE_LABELS: Record<string, string> = { CONSUMER: "Consumidor", TRADE: "Profesional", WHOLESALE: "Mayorista" };

type SortKey = "sessionMinutes" | "itemsBought" | "totalSpent";
type SortDir = "asc" | "desc";

function sortClients(clients: ClientRow[], key: SortKey, dir: SortDir): ClientRow[] {
  return [...clients].sort((a, b) => dir === "desc" ? b[key] - a[key] : a[key] - b[key]);
}

function RankingTable({ title, icon: Icon, data, valueKey, formatFn, period, iconColor }: {
  title: string; icon: any; data: ClientRow[]; valueKey: SortKey;
  formatFn: (val: number, period: Period) => string; period: Period; iconColor: string;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`size-5 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 5).map((c, i) => (
              <TableRow key={c.id}>
                <TableCell><span className="flex size-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">{i + 1}</span></TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[c.customerType] || c.customerType}</Badge></TableCell>
                <TableCell className="text-right font-semibold text-sm">{formatFn(c[valueKey], period)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AnalisisClientesPage() {
  const [period, setPeriod] = useState<Period>("1m");

  const masActivos = sortClients(MOCK_CLIENTS, "sessionMinutes", "desc");
  const menosActivos = sortClients(MOCK_CLIENTS, "sessionMinutes", "asc");
  const masCompradores = sortClients(MOCK_CLIENTS, "itemsBought", "desc");
  const menosCompradores = sortClients(MOCK_CLIENTS, "itemsBought", "asc");
  const masGastadores = sortClients(MOCK_CLIENTS, "totalSpent", "desc");
  const menosGastadores = sortClients(MOCK_CLIENTS, "totalSpent", "asc");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analisis de clientes</h1>
          <p className="text-sm text-muted-foreground">Rankings de actividad, compras y gastos de tus clientes.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10"><Users className="size-6 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{MOCK_CLIENTS.length}</p><p className="text-xs text-muted-foreground">Clientes totales</p></div>
        </CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10"><ShoppingCart className="size-6 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{scaleVal(MOCK_CLIENTS.reduce((a, c) => a + c.itemsBought, 0), period).toLocaleString("es-AR")}</p><p className="text-xs text-muted-foreground">Items comprados</p></div>
        </CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10"><DollarSign className="size-6 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{formatPrice(scaleVal(MOCK_CLIENTS.reduce((a, c) => a + c.totalSpent, 0), period))}</p><p className="text-xs text-muted-foreground">Facturacion total</p></div>
        </CardContent></Card>
      </div>

      {/* Actividad (tiempo de sesion) */}
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 pt-2"><Clock className="size-5 text-blue-600" />Por tiempo de sesion</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingTable
          title="Clientes mas activos" icon={TrendingUp} data={masActivos}
          valueKey="sessionMinutes" period={period} iconColor="text-emerald-600"
          formatFn={(val, p) => scaleTime(val, p)}
        />
        <RankingTable
          title="Clientes menos activos" icon={TrendingDown} data={menosActivos}
          valueKey="sessionMinutes" period={period} iconColor="text-red-500"
          formatFn={(val, p) => scaleTime(val, p)}
        />
      </div>

      {/* Compras (cantidad de items) */}
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 pt-2"><ShoppingCart className="size-5 text-emerald-600" />Por cantidad de items comprados</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingTable
          title="Clientes mas compradores" icon={TrendingUp} data={masCompradores}
          valueKey="itemsBought" period={period} iconColor="text-emerald-600"
          formatFn={(val, p) => `${scaleVal(val, p).toLocaleString("es-AR")} items`}
        />
        <RankingTable
          title="Clientes menos compradores" icon={TrendingDown} data={menosCompradores}
          valueKey="itemsBought" period={period} iconColor="text-red-500"
          formatFn={(val, p) => `${scaleVal(val, p).toLocaleString("es-AR")} items`}
        />
      </div>

      {/* Gastos (monto acumulado) */}
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 pt-2"><DollarSign className="size-5 text-amber-600" />Por monto de compras acumulado</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingTable
          title="Clientes mas gastadores" icon={TrendingUp} data={masGastadores}
          valueKey="totalSpent" period={period} iconColor="text-emerald-600"
          formatFn={(val, p) => formatPrice(scaleVal(val, p))}
        />
        <RankingTable
          title="Clientes menos gastadores" icon={TrendingDown} data={menosGastadores}
          valueKey="totalSpent" period={period} iconColor="text-red-500"
          formatFn={(val, p) => formatPrice(scaleVal(val, p))}
        />
      </div>
    </div>
  );
}
