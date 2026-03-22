"use client";

import { BarChart3, DollarSign, Eye, Package, PackageMinus, PackageSearch, ShoppingCart, TrendingDown, TrendingUp, Users, Warehouse } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "15d", label: "Últimos 15 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "ytd", label: "Desde inicio del año" },
];

type Period = "7d" | "15d" | "30d" | "ytd";

function scaleValue(base: number, period: Period): number {
  const factors: Record<Period, number> = { "7d": 0.25, "15d": 0.5, "30d": 1, "ytd": 3.2 };
  return Math.round(base * factors[period]);
}

const METRICS_BASE = [
  { label: "Ventas totales", baseValue: 8742300, icon: DollarSign, trend: "+12.4%", color: "text-emerald-600", format: true },
  { label: "Pedidos", baseValue: 186, icon: ShoppingCart, trend: "+5.2%", color: "text-blue-600", format: false },
  { label: "Ticket promedio", baseValue: 46990, icon: TrendingUp, trend: "+6.8%", color: "text-violet-600", format: true },
  { label: "Nuevos clientes", baseValue: 42, icon: Users, trend: "+18%", color: "text-amber-600", format: false },
];

const TOP_PRODUCTS_BASE = [
  { name: "Soldadora Inverter Lusqtoff Iron 200", sku: "LUS-IRON200", units: 24, revenue: 6936000 },
  { name: "Grifería FV Puelo Monocomando", sku: "FV-PUELO-CR", units: 18, revenue: 3330000 },
  { name: "Compresor Lusqtoff LC-2550BK 50L", sku: "LUS-LC2550BK", units: 15, revenue: 5175000 },
  { name: "Hidrolavadora Lusqtoff HL-120", sku: "LUS-HL120", units: 14, revenue: 1946000 },
  { name: "Taladro Atornillador Lusqtoff 12V", sku: "LUS-TAL128A", units: 12, revenue: 1380000 },
  { name: "Inodoro Ferrum Bari Largo", sku: "FERR-BARI-BL", units: 10, revenue: 2450000 },
  { name: "Vanitory Schneider Aqua 80cm", sku: "SCH-AQUA80-BL", units: 8, revenue: 2560000 },
  { name: "Set Destornilladores Stanley 10pz", sku: "STAN-DEST-10PZ", units: 32, revenue: 1024000 },
];

const MOST_VIEWED = [
  { name: "Soldadora Inverter Lusqtoff Iron 200", sku: "LUS-IRON200", views: 1842 },
  { name: "Hidrolavadora Lusqtoff HL-150", sku: "LUS-HL150", views: 1256 },
  { name: "Grupo Electrógeno Lusqtoff LG3500EX", sku: "LUS-LG3500EX", views: 1134 },
  { name: "Amoladora Angular Lusqtoff 820W", sku: "LUS-L820", views: 980 },
  { name: "Compresor Lusqtoff LC-2550BK 50L", sku: "LUS-LC2550BK", views: 876 },
  { name: "Grifería FV Puelo Monocomando", sku: "FV-PUELO-CR", views: 812 },
  { name: "Taladro Percutor Lusqtoff 850W", sku: "LUS-TP813", views: 745 },
  { name: "Soldadora MIG Lusqtoff Smart MIG 175", sku: "LUS-SMARTMIG175", views: 698 },
];

const LEAST_SOLD = [
  { name: "Motobomba Naftera Lusqtoff 5.5HP", sku: "LUS-LMB20", units: 0, stock: 1 },
  { name: "Martillo Demoledor Lusqtoff 1500W", sku: "LUS-MDL1500", units: 1, stock: 1 },
  { name: "Soldadura estaño 60/40 250g", sku: "SOL-6040-250", units: 1, stock: 2 },
  { name: "Cinta métrica 8m magnética", sku: "FIS-CM8", units: 2, stock: 55 },
  { name: "Aspiradora Lusqtoff 1400W 25L", sku: "LUS-LA1400M", units: 2, stock: 1 },
  { name: "Cargador Arrancador Lusqtoff PQ-500", sku: "LUS-PQ500", units: 2, stock: 1 },
];

const MOST_STOCK = [
  { name: "Caño PVC presión Ø32 mm x 4 m", sku: "PVC-32-4", stock: 120 },
  { name: "Cinta métrica 8m magnética", sku: "FIS-CM8", stock: 55 },
  { name: "Llave ajustable 10\" Tramontina", sku: "TRA-AJ-10", stock: 42 },
  { name: "Set Destornilladores Stanley 10pz", sku: "STAN-DEST-10PZ", stock: 38 },
  { name: "Codo PVC 90° Ø50mm", sku: "PVC-C90-50", stock: 35 },
  { name: "Teflón grande 20m x 19mm", sku: "TEF-20-19", stock: 30 },
];

const LEAST_STOCK = [
  { name: "Motobomba Naftera Lusqtoff 5.5HP", sku: "LUS-LMB20", stock: 1 },
  { name: "Soldadora Inverter Lusqtoff Iron 100", sku: "LUS-IRON100", stock: 1 },
  { name: "Soldadora Inverter Lusqtoff Iron 150", sku: "LUS-IRON150", stock: 1 },
  { name: "Soldadora Inverter Lusqtoff Iron 200", sku: "LUS-IRON200", stock: 1 },
  { name: "Soldadora Inverter Lusqtoff Iron 300", sku: "LUS-IRON300", stock: 1 },
  { name: "Soldadura estaño 60/40 250g", sku: "SOL-6040-250", stock: 2 },
  { name: "Inodoro largo Ferrum Veneto", sku: "FER-VEN-L", stock: 3 },
  { name: "Vanitory 60 cm melamina blanco", sku: "VAN-60-W", stock: 4 },
];

const TOP_CATEGORIES = [
  { name: "Herramientas Eléctricas", orders: 68, revenue: 12450000, pct: 28 },
  { name: "Sanitarios y Baño", orders: 42, revenue: 8900000, pct: 20 },
  { name: "Soldadoras", orders: 38, revenue: 7200000, pct: 16 },
  { name: "Compresores", orders: 22, revenue: 5800000, pct: 13 },
  { name: "Plomería", orders: 35, revenue: 4200000, pct: 10 },
  { name: "Pinturería", orders: 18, revenue: 3100000, pct: 7 },
  { name: "Otros", orders: 12, revenue: 2600000, pct: 6 },
];

export default function AdminReportesPage() {
  const [period, setPeriod] = useState<Period>("30d");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reportes</h1>
          <p className="text-sm text-muted-foreground">Métricas clave y análisis de ventas.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-52 border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS_BASE.map((m) => {
          const val = scaleValue(m.baseValue, period);
          return (
            <Card key={m.label} className="border-border shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted ${m.color}`}>
                  <m.icon className="size-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-bold text-foreground">{m.format ? formatPrice(val) : val.toLocaleString("es-AR")}</p>
                  <p className={`text-xs font-semibold ${m.color}`}>{m.trend} vs. período ant.</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="size-5 text-blue-600" />
              Productos más consultados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Visitas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOST_VIEWED.map((p, i) => (
                  <TableRow key={p.sku}>
                    <TableCell><Badge variant={i < 3 ? "default" : "outline"} className="size-7 justify-center rounded-full">{i + 1}</Badge></TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-right font-semibold">{scaleValue(p.views, period).toLocaleString("es-AR")}</TableCell>
                  </TableRow>
                ))}
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
                  <TableHead className="text-right">Vendidos</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LEAST_SOLD.map((p) => (
                  <TableRow key={p.sku}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-right"><Badge variant={p.units === 0 ? "destructive" : "secondary"}>{scaleValue(p.units, period)}</Badge></TableCell>
                    <TableCell className="text-right">{p.stock}</TableCell>
                  </TableRow>
                ))}
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
                {MOST_STOCK.map((p) => (
                  <TableRow key={p.sku}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">{p.stock}</TableCell>
                  </TableRow>
                ))}
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
                {LEAST_STOCK.map((p) => (
                  <TableRow key={p.sku}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-right"><Badge variant={p.stock <= 1 ? "destructive" : "secondary"} className="font-semibold">{p.stock}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-5 text-primary" />
            Productos más vendidos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>#</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Facturación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TOP_PRODUCTS_BASE.map((p, i) => (
                <TableRow key={p.sku}>
                  <TableCell><Badge variant={i < 3 ? "default" : "outline"} className="size-7 justify-center rounded-full">{i + 1}</Badge></TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="text-right">{scaleValue(p.units, period)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatPrice(scaleValue(p.revenue, period))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-5 text-primary" />
            Ventas por categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {TOP_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-muted-foreground">{cat.pct}%</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-2.5 flex-1 rounded-full bg-muted">
                    <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${cat.pct}%` }} />
                  </div>
                  <span className="w-24 text-right text-xs text-muted-foreground">{formatPrice(scaleValue(cat.revenue, period))}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
