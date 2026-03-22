import { Boxes, ShoppingCart, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { StatsCard } from "@/components/admin/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

const recentOrders = [
  {
    id: "1",
    number: "FER-2026-001842",
    client: "Instalaciones Delta SRL",
    date: "18 mar 2026",
    status: "PREPARING",
    total: 428_950,
  },
  {
    id: "2",
    number: "FER-2026-001841",
    client: "María González",
    date: "18 mar 2026",
    status: "PAYMENT_APPROVED",
    total: 67_200,
  },
  {
    id: "3",
    number: "FER-2026-001840",
    client: "Gasista Norte",
    date: "17 mar 2026",
    status: "SHIPPED",
    total: 312_400,
  },
  {
    id: "4",
    number: "FER-2026-001839",
    client: "Constructora Sur SA",
    date: "17 mar 2026",
    status: "DELIVERED",
    total: 1_245_000,
  },
  {
    id: "5",
    number: "FER-2026-001838",
    client: "Juan Pérez",
    date: "16 mar 2026",
    status: "PAYMENT_PENDING",
    total: 89_500,
  },
];

const lowStock = [
  { name: "Llave cruz FGV 12\"", sku: "FGV-LC-12", stock: 2, threshold: 5 },
  { name: "Cemento avellaneda 50 kg", sku: "CEM-AV-50", stock: 4, threshold: 10 },
  { name: "Manguera riego 1/2\" x 25 m", sku: "MG-12-25", stock: 1, threshold: 5 },
  { name: "Inodoro Ferrum Andina blanco", sku: "FER-AND-W", stock: 3, threshold: 5 },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Resumen de tu ferretería y señales operativas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Ventas del mes"
          value={formatPrice(8_742_300)}
          icon={TrendingUp}
          trend={12.4}
          trendLabel="vs. mes anterior"
        />
        <StatsCard
          title="Pedidos del mes"
          value="186"
          icon={ShoppingCart}
          trend={5.2}
          trendLabel="vs. mes anterior"
        />
        <StatsCard
          title="Productos activos"
          value="1.284"
          icon={Boxes}
          trend={-0.8}
          trendLabel="vs. mes anterior"
        />
        <StatsCard
          title="Clientes registrados"
          value="3.902"
          icon={Users}
          trend={8.1}
          trendLabel="vs. mes anterior"
        />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-primary">
            Ventas últimos 30 días
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            Gráfico de ventas
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Pedidos recientes
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/pedidos">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.number}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{o.client}</TableCell>
                    <TableCell className="text-muted-foreground">{o.date}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(o.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border border-amber-200/80 bg-amber-50/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-amber-950">
              Alerta de stock bajo
            </CardTitle>
            <p className="text-sm text-amber-900/80">
              Productos por debajo del umbral configurado.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.map((p) => (
              <div
                key={p.sku}
                className="flex items-center justify-between rounded-md border border-amber-200/60 bg-white/80 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-amber-800">{p.stock} u.</p>
                  <p className="text-xs text-muted-foreground">
                    umbral {p.threshold}
                  </p>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/admin/productos">Ir a productos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
