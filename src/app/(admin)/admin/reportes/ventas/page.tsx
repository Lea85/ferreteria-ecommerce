"use client";

import {
  DollarSign, Eye, Loader2, Package, PackageMinus, ShoppingCart,
  TrendingDown, TrendingUp, Users, Warehouse,
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

type Period = "7d" | "15d" | "30d" | "ytd";

const PERIODS = [
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "15d", label: "Ultimos 15 dias" },
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "ytd", label: "Desde inicio del año" },
];

type ProductRow = { name: string; sku: string; units: number; revenue: number };
type StockRow = { name: string; sku: string; stock: number };
type CatRow = { name: string; orders: number; revenue: number; pct: number };

type ReportData = {
  metrics: { totalRevenue: number; totalOrders: number; avgTicket: number; newCustomers: number };
  topProducts: ProductRow[];
  leastSold: ProductRow[];
  mostStock: StockRow[];
  leastStock: StockRow[];
  topCategories: CatRow[];
};

export default function AnalisisVentasPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reports/ventas?period=${period}`)
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

  const m = data?.metrics || { totalRevenue: 0, totalOrders: 0, avgTicket: 0, newCustomers: 0 };
  const topProducts = data?.topProducts || [];
  const leastSold = data?.leastSold || [];
  const mostStock = data?.mostStock || [];
  const leastStock = data?.leastStock || [];
  const topCategories = data?.topCategories || [];

  const hasData = m.totalOrders > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analisis de ventas</h1>
          <p className="text-sm text-muted-foreground">Metricas calculadas en base a datos reales del sitio.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-52 border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Ventas totales", value: formatPrice(m.totalRevenue), icon: DollarSign, color: "text-emerald-600" },
          { label: "Pedidos", value: m.totalOrders.toLocaleString("es-AR"), icon: ShoppingCart, color: "text-blue-600" },
          { label: "Ticket promedio", value: formatPrice(m.avgTicket), icon: TrendingUp, color: "text-violet-600" },
          { label: "Nuevos clientes", value: m.newCustomers.toLocaleString("es-AR"), icon: Users, color: "text-amber-600" },
        ].map((k) => (
          <Card key={k.label} className="border-border shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted ${k.color}`}><k.icon className="size-6" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold text-foreground">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasData && (
        <Card className="border-dashed border-amber-300 bg-amber-50/50">
          <CardContent className="py-8 text-center text-amber-800">
            <ShoppingCart className="mx-auto size-10 text-amber-400 mb-3" />
            <p className="font-semibold">No hay pedidos en el periodo seleccionado</p>
            <p className="text-sm mt-1">Los datos se calculan a partir de pedidos reales. Proba seleccionar un periodo mas amplio.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-5 text-emerald-600" />Productos mas vendidos</CardTitle></CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader><TableRow className="bg-muted/40">
                <TableHead>#</TableHead><TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Unid.</TableHead><TableHead className="text-right">Facturacion</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {topProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>
                ) : topProducts.map((p, i) => (
                  <TableRow key={p.sku + i}>
                    <TableCell><Badge variant={i < 3 ? "default" : "outline"} className="size-7 justify-center rounded-full">{i + 1}</Badge></TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-right">{p.units}</TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingDown className="size-5 text-red-500" />Productos menos vendidos</CardTitle></CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader><TableRow className="bg-muted/40">
                <TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Unid.</TableHead><TableHead className="text-right">Facturacion</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {leastSold.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>
                ) : leastSold.map((p, i) => (
                  <TableRow key={p.sku + i}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-right"><Badge variant={p.units === 0 ? "destructive" : "secondary"}>{p.units}</Badge></TableCell>
                    <TableCell className="text-right">{formatPrice(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Warehouse className="size-5 text-emerald-600" />Productos con mayor stock</CardTitle></CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader><TableRow className="bg-muted/40"><TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Stock</TableHead></TableRow></TableHeader>
              <TableBody>
                {mostStock.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>
                ) : mostStock.map((p, i) => (
                  <TableRow key={p.sku + i}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell><TableCell className="text-right font-semibold text-emerald-600">{p.stock}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackageMinus className="size-5 text-amber-600" />Productos con menor stock</CardTitle></CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader><TableRow className="bg-muted/40"><TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Stock</TableHead></TableRow></TableHeader>
              <TableBody>
                {leastStock.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>
                ) : leastStock.map((p, i) => (
                  <TableRow key={p.sku + i}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell><TableCell className="text-right"><Badge variant={p.stock <= 1 ? "destructive" : "secondary"} className="font-semibold">{p.stock}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="size-5 text-primary" />Ventas por categoria</CardTitle></CardHeader>
        <CardContent>
          {topCategories.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Sin datos de categorias para este periodo.</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between text-sm"><span className="font-medium">{cat.name}</span><span className="text-muted-foreground">{cat.pct}%</span></div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-2.5 flex-1 rounded-full bg-muted"><div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${cat.pct}%` }} /></div>
                    <span className="w-24 text-right text-xs text-muted-foreground">{formatPrice(cat.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
