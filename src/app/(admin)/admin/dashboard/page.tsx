"use client";

import { Boxes, Loader2, ShoppingCart, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { StatsCard } from "@/components/admin/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

type DashData = {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  recentOrders: { id: string; orderNumber: string; customerName: string; customerEmail: string; status: string; total: number; createdAt: string }[];
  lowStock: { id: string; name: string; sku: string; stock: number; lowStockThreshold: number }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  const d = data || { totalRevenue: 0, totalOrders: 0, totalProducts: 0, totalCustomers: 0, recentOrders: [], lowStock: [] };

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">Resumen operativo basado en datos reales.</p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Facturacion total" value={formatPrice(d.totalRevenue)} icon={TrendingUp} />
        <StatsCard title="Pedidos totales" value={d.totalOrders.toLocaleString("es-AR")} icon={ShoppingCart} />
        <StatsCard title="Productos activos" value={d.totalProducts.toLocaleString("es-AR")} icon={Boxes} />
        <StatsCard title="Clientes registrados" value={d.totalCustomers.toLocaleString("es-AR")} icon={Users} />
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
                  <TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.recentOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No hay pedidos aun</TableCell></TableRow>
                ) : d.recentOrders.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell><Link href={`/admin/pedidos/${o.id}`} className="font-mono text-xs text-primary hover:underline">{o.orderNumber}</Link></TableCell>
                    <TableCell className="max-w-[140px] truncate">{o.customerName || o.customerEmail || "—"}</TableCell>
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
            {d.lowStock.length === 0 ? (
              <p className="text-center text-sm text-amber-800/60 py-4">No hay productos con stock bajo</p>
            ) : d.lowStock.map((p) => (
              <Link key={p.sku} href={`/admin/productos/${p.id}`} className="flex items-center justify-between rounded-md border border-amber-200/60 bg-white/80 px-3 py-2 text-sm transition-colors hover:bg-amber-50">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-amber-800">{p.stock} u.</p>
                  <p className="text-xs text-muted-foreground">umbral {p.lowStockThreshold}</p>
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
