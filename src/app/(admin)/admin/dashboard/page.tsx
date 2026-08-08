"use client";

import { Boxes, CheckCircle2, Clock, Loader2, ShoppingCart, TrendingUp, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { StatsCard } from "@/components/admin/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useIsFullAdmin } from "@/hooks/use-is-admin";
import { formatPrice } from "@/lib/utils";

type PendingApproval = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  taxId: string | null;
  customerType: string;
  createdAt: string;
};

type DashData = {
  totalRevenue: number | null;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  recentOrders: { id: string; orderNumber: string; customerName: string; customerEmail: string; status: string; total: number; createdAt: string }[];
  lowStock: { id: string; name: string; sku: string; stock: number; lowStockThreshold: number }[];
  pendingApprovalsCount: number;
  pendingApprovals: PendingApproval[];
};

function formatCuit(taxId: string | null): string | null {
  if (!taxId) return null;
  const digits = taxId.replace(/\D/g, "");
  if (digits.length !== 11) return taxId;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export default function AdminDashboardPage() {
  const isFullAdmin = useIsFullAdmin();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: string) {
    setApprovingId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isApproved: true }),
      });
      const resData = await res.json();
      if (!res.ok) {
        toast.error(resData.error ?? "No se pudo aprobar");
        return;
      }
      toast.success("Cuenta aprobada");
      setData((prev) =>
        prev
          ? {
              ...prev,
              pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1),
              pendingApprovals: prev.pendingApprovals.filter((u) => u.id !== id),
            }
          : prev,
      );
    } catch {
      toast.error("Error de red");
    } finally {
      setApprovingId(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  const d = data || {
    totalRevenue: null,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    recentOrders: [],
    lowStock: [],
    pendingApprovalsCount: 0,
    pendingApprovals: [],
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">Resumen operativo basado en datos reales.</p>

      {d.pendingApprovalsCount > 0 && (
        <Card className="border-2 border-amber-400 bg-amber-50 shadow-md ring-1 ring-amber-300/60">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-700">
                <UserCheck className="size-5" />
              </span>
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-950">
                  Clientes pendientes de aprobación
                  <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                    {d.pendingApprovalsCount}
                  </Badge>
                </CardTitle>
                <p className="mt-1 text-sm text-amber-900/80">
                  Hay solicitudes profesionales / gremio esperando revisión. Aprobalas
                  para que puedan iniciar sesión y ver precios especiales.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-300 bg-white/70 text-amber-800 hover:bg-white"
              asChild
            >
              <Link href="/admin/usuarios?approved=false">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.pendingApprovals.map((u) => {
              const fullName = `${u.name}${u.lastName ? ` ${u.lastName}` : ""}`.trim();
              const cuit = formatCuit(u.taxId);
              return (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{fullName || u.email}</p>
                      {u.companyName ? (
                        <Badge variant="secondary" className="font-normal">
                          {u.companyName}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {u.email}
                      {u.phone ? ` · ${u.phone}` : ""}
                      {cuit ? ` · CUIT ${cuit}` : ""}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
                      <Clock className="size-3" />
                      Solicitado el{" "}
                      {new Date(u.createdAt).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      asChild
                    >
                      <Link href="/admin/usuarios?approved=false">Revisar</Link>
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => void handleApprove(u.id)}
                      disabled={approvingId === u.id}
                    >
                      {approvingId === u.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Aprobar
                    </Button>
                  </div>
                </div>
              );
            })}
            {d.pendingApprovalsCount > d.pendingApprovals.length && (
              <p className="pt-1 text-center text-xs text-amber-800/80">
                Y {d.pendingApprovalsCount - d.pendingApprovals.length} solicitud(es) más.
                <Link
                  href="/admin/usuarios?approved=false"
                  className="ml-1 font-semibold underline"
                >
                  Ver todas
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div
        className={
          isFullAdmin
            ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        }
      >
        {isFullAdmin && d.totalRevenue != null ? (
          <StatsCard
            title="Facturacion total"
            value={formatPrice(d.totalRevenue)}
            icon={TrendingUp}
          />
        ) : null}
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
            <p className="text-sm text-amber-900/80">
              Variantes cuyo stock actual es menor o igual al stock mínimo
              configurado en el producto.
            </p>
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
                  <p className="text-xs text-muted-foreground">
                    mín. {p.lowStockThreshold} u.
                  </p>
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
