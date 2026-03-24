"use client";

import {
  Clock, DollarSign, Loader2, ShoppingCart, TrendingDown, TrendingUp, Users,
} from "lucide-react";
import { useEffect, useState } from "react";

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

const TYPE_LABELS: Record<string, string> = {
  CONSUMER: "Consumidor", TRADE: "Profesional", WHOLESALE: "Mayorista",
};

type ClientRow = {
  id: string; name: string; email: string; customerType: string;
  orderCount: number; itemsBought: number; totalSpent: number;
};

type ReportData = {
  summary: { totalClients: number; activeClients: number; totalItems: number; totalRevenue: number };
  topBuyers: ClientRow[];
  leastBuyers: ClientRow[];
  topSpenders: ClientRow[];
  leastSpenders: ClientRow[];
  mostActive: ClientRow[];
  leastActive: ClientRow[];
};

function RankingTable({ title, icon: Icon, data, valueFn, iconColor }: {
  title: string; icon: any; data: ClientRow[];
  valueFn: (c: ClientRow) => string; iconColor: string;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Icon className={`size-5 ${iconColor}`} />{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-8">#</TableHead><TableHead>Cliente</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin datos para este periodo</TableCell></TableRow>
            ) : data.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell><span className="flex size-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">{i + 1}</span></TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[c.customerType] || c.customerType}</Badge></TableCell>
                <TableCell className="text-right font-semibold text-sm">{valueFn(c)}</TableCell>
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
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reports/clientes?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = data?.summary || { totalClients: 0, activeClients: 0, totalItems: 0, totalRevenue: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analisis de clientes</h1>
          <p className="text-sm text-muted-foreground">Rankings calculados a partir de datos reales de pedidos.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10"><Users className="size-6 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{s.totalClients}</p><p className="text-xs text-muted-foreground">Clientes registrados</p></div>
        </CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10"><TrendingUp className="size-6 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{s.activeClients}</p><p className="text-xs text-muted-foreground">Con compras en el periodo</p></div>
        </CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/10"><ShoppingCart className="size-6 text-violet-600" /></div>
          <div><p className="text-2xl font-bold">{s.totalItems.toLocaleString("es-AR")}</p><p className="text-xs text-muted-foreground">Items comprados</p></div>
        </CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10"><DollarSign className="size-6 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{formatPrice(s.totalRevenue)}</p><p className="text-xs text-muted-foreground">Facturacion total</p></div>
        </CardContent></Card>
      </div>

      {s.activeClients === 0 && (
        <Card className="border-dashed border-amber-300 bg-amber-50/50">
          <CardContent className="py-8 text-center text-amber-800">
            <Users className="mx-auto size-10 text-amber-400 mb-3" />
            <p className="font-semibold">No hay clientes con compras en el periodo seleccionado</p>
            <p className="text-sm mt-1">Los rankings se calculan a partir de pedidos reales. Proba seleccionar un periodo mas amplio.</p>
          </CardContent>
        </Card>
      )}

      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 pt-2"><ShoppingCart className="size-5 text-emerald-600" />Por cantidad de pedidos</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingTable title="Clientes mas activos" icon={TrendingUp} data={data?.mostActive || []} iconColor="text-emerald-600"
          valueFn={(c) => `${c.orderCount} pedido${c.orderCount !== 1 ? "s" : ""}`} />
        <RankingTable title="Clientes menos activos" icon={TrendingDown} data={data?.leastActive || []} iconColor="text-red-500"
          valueFn={(c) => `${c.orderCount} pedido${c.orderCount !== 1 ? "s" : ""}`} />
      </div>

      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 pt-2"><ShoppingCart className="size-5 text-blue-600" />Por cantidad de items comprados</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingTable title="Clientes mas compradores" icon={TrendingUp} data={data?.topBuyers || []} iconColor="text-emerald-600"
          valueFn={(c) => `${c.itemsBought.toLocaleString("es-AR")} items`} />
        <RankingTable title="Clientes menos compradores" icon={TrendingDown} data={data?.leastBuyers || []} iconColor="text-red-500"
          valueFn={(c) => `${c.itemsBought.toLocaleString("es-AR")} items`} />
      </div>

      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 pt-2"><DollarSign className="size-5 text-amber-600" />Por monto de compras acumulado</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingTable title="Clientes mas gastadores" icon={TrendingUp} data={data?.topSpenders || []} iconColor="text-emerald-600"
          valueFn={(c) => formatPrice(c.totalSpent)} />
        <RankingTable title="Clientes menos gastadores" icon={TrendingDown} data={data?.leastSpenders || []} iconColor="text-red-500"
          valueFn={(c) => formatPrice(c.totalSpent)} />
      </div>
    </div>
  );
}
