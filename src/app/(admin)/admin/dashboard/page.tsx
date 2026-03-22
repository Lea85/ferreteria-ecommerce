"use client";

import { Boxes, ShoppingCart, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { StatsCard } from "@/components/admin/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

const recentOrders = [
  { id: "1", number: "FER-2026-001842", client: "Instalaciones Delta SRL", date: "18 mar 2026", status: "PREPARING", total: 428950 },
  { id: "2", number: "FER-2026-001841", client: "Maria Gonzalez", date: "18 mar 2026", status: "PAYMENT_APPROVED", total: 67200 },
  { id: "3", number: "FER-2026-001840", client: "Gasista Norte", date: "17 mar 2026", status: "SHIPPED", total: 312400 },
  { id: "4", number: "FER-2026-001839", client: "Constructora Sur SA", date: "17 mar 2026", status: "DELIVERED", total: 1245000 },
  { id: "5", number: "FER-2026-001838", client: "Juan Perez", date: "16 mar 2026", status: "PAYMENT_PENDING", total: 89500 },
];

const lowStock = [
  { id: "p3", name: "Inodoro largo Ferrum Veneto", sku: "FER-VEN-L", stock: 3, threshold: 5 },
  { id: "p10", name: "Soldadura estanio 60/40 250g", sku: "SOL-6040-250", stock: 2, threshold: 5 },
  { id: "p7", name: "Vanitory 60 cm melamina blanco", sku: "VAN-60-W", stock: 4, threshold: 5 },
  { id: "p6", name: "Termofusora PPR 800 W", sku: "PPR-TF800", stock: 6, threshold: 10 },
];

const salesYTD = [
  { month: "Ene", items: 412, revenue: 7600000 },
  { month: "Feb", items: 468, revenue: 7900000 },
  { month: "Mar", items: 510, revenue: 8742000 },
];

const salesThisMonth = [
  { week: "Sem 1", items: 118, revenue: 2100000 },
  { week: "Sem 2", items: 135, revenue: 2350000 },
  { week: "Sem 3", items: 142, revenue: 2480000 },
  { week: "Sem 4", items: 115, revenue: 1812000 },
];

const salesThisWeek = [
  { day: "Lun", items: 22, revenue: 385000 },
  { day: "Mar", items: 28, revenue: 412000 },
  { day: "Mie", items: 31, revenue: 520000 },
  { day: "Jue", items: 19, revenue: 295000 },
  { day: "Vie", items: 35, revenue: 610000 },
  { day: "Sab", items: 15, revenue: 258000 },
];

const BLUE = "#2563eb";
const GREEN = "#16a34a";

function fmtShort(v: number) {
  if (v >= 1000000) return "$" + (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return "$" + (v / 1000).toFixed(0) + "K";
  return "$" + v;
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Resumen de tu ferreteria y seniales operativas.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Ventas del mes" value={formatPrice(8742300)} icon={TrendingUp} trend={12.4} trendLabel="vs. mes anterior" />
        <StatsCard title="Pedidos del mes" value="186" icon={ShoppingCart} trend={5.2} trendLabel="vs. mes anterior" />
        <StatsCard title="Productos activos" value="1.284" icon={Boxes} trend={-0.8} trendLabel="vs. mes anterior" />
        <StatsCard title="Clientes registrados" value="3.902" icon={Users} trend={8.1} trendLabel="vs. mes anterior" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold text-primary">Items vendidos YTD (por mes)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesYTD}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="items" fill={BLUE} name="Items" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold text-primary">Facturacion YTD (por mes)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesYTD}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={fmtShort} />
                <Tooltip formatter={(v) => formatPrice(Number(v))} />
                <Bar dataKey="revenue" fill={GREEN} name="Facturacion" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold text-primary">Items este mes (por semana)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={salesThisMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="items" stroke={BLUE} name="Items" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold text-primary">Facturacion este mes (por semana)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={salesThisMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={fmtShort} />
                <Tooltip formatter={(v) => formatPrice(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke={GREEN} name="Facturacion" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold text-primary">Items esta semana (por dia)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesThisWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="items" fill={BLUE} name="Items" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold text-primary">Facturacion esta semana (por dia)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesThisWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={fmtShort} />
                <Tooltip formatter={(v) => formatPrice(Number(v))} />
                <Bar dataKey="revenue" fill={GREEN} name="Facturacion" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Pedidos recientes</CardTitle>
            <Button variant="outline" size="sm" asChild><Link href="/admin/pedidos">Ver todos</Link></Button>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/admin/pedidos/${o.id}`} className="font-mono text-xs text-primary hover:underline">{o.number}</Link>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate">{o.client}</TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(o.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border border-amber-200/80 bg-amber-50/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-amber-950">Alerta de stock bajo</CardTitle>
            <p className="text-sm text-amber-900/80">Productos por debajo del umbral configurado.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.map((p) => (
              <Link key={p.sku} href={`/admin/productos/${p.id}`} className="flex items-center justify-between rounded-md border border-amber-200/60 bg-white/80 px-3 py-2 text-sm transition-colors hover:bg-amber-50">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-amber-800">{p.stock} u.</p>
                  <p className="text-xs text-muted-foreground">umbral {p.threshold}</p>
                </div>
              </Link>
            ))}
            <Button variant="outline" size="sm" className="w-full" asChild><Link href="/admin/productos">Ir a productos</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
