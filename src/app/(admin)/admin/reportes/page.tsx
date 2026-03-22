"use client";

import { BarChart3, DollarSign, Package, ShoppingCart, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

const METRICS = [
  { label: "Ventas totales (mes)", value: "$8.742.300", icon: DollarSign, trend: "+12.4%", color: "text-emerald-600" },
  { label: "Pedidos (mes)", value: "186", icon: ShoppingCart, trend: "+5.2%", color: "text-blue-600" },
  { label: "Ticket promedio", value: "$46.990", icon: TrendingUp, trend: "+6.8%", color: "text-violet-600" },
  { label: "Nuevos clientes (mes)", value: "42", icon: Users, trend: "+18%", color: "text-amber-600" },
];

const TOP_PRODUCTS = [
  { name: "Soldadora Inverter Lusqtoff Iron 200", sku: "LUS-IRON200", units: 24, revenue: 6936000 },
  { name: "Grifería FV Puelo Monocomando", sku: "FV-PUELO-CR", units: 18, revenue: 3330000 },
  { name: "Compresor Lusqtoff LC-2550BK 50L", sku: "LUS-LC2550BK", units: 15, revenue: 5175000 },
  { name: "Hidrolavadora Lusqtoff HL-120", sku: "LUS-HL120", units: 14, revenue: 1946000 },
  { name: "Taladro Atornillador Lusqtoff 12V", sku: "LUS-TAL128A", units: 12, revenue: 1380000 },
  { name: "Inodoro Ferrum Bari Largo", sku: "FERR-BARI-BL", units: 10, revenue: 2450000 },
  { name: "Vanitory Schneider Aqua 80cm", sku: "SCH-AQUA80-BL", units: 8, revenue: 2560000 },
  { name: "Set Destornilladores Stanley 10pz", sku: "STAN-DEST-10PZ", units: 32, revenue: 1024000 },
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

const MONTHLY_SALES = [
  { month: "Oct 2025", orders: 142, revenue: 6200000 },
  { month: "Nov 2025", orders: 158, revenue: 7100000 },
  { month: "Dic 2025", orders: 198, revenue: 9800000 },
  { month: "Ene 2026", orders: 165, revenue: 7600000 },
  { month: "Feb 2026", orders: 172, revenue: 7900000 },
  { month: "Mar 2026", orders: 186, revenue: 8742000 },
];

export default function AdminReportesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Métricas clave y análisis de ventas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((m) => (
          <Card key={m.label} className="border-border shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted ${m.color}`}>
                <m.icon className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
                <p className={`text-xs font-semibold ${m.color}`}>{m.trend} vs. mes anterior</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-5 text-primary" />
              Ventas mensuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Facturación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MONTHLY_SALES.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right">{row.orders}</TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(row.revenue)}</TableCell>
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
                    <span className="w-24 text-right text-xs text-muted-foreground">{formatPrice(cat.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-5 text-primary" />
            Productos más vendidos (mes)
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
              {TOP_PRODUCTS.map((p, i) => (
                <TableRow key={p.sku}>
                  <TableCell>
                    <Badge variant={i < 3 ? "default" : "outline"} className="size-7 justify-center rounded-full">
                      {i + 1}
                    </Badge>
                  </TableCell>
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
    </div>
  );
}
