"use client";

import {
  AlertTriangle, BarChart3, ExternalLink, Globe, Loader2, Monitor,
  MousePointerClick, Smartphone, TrendingUp, Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SiteData = {
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  totalUsers: number;
  totalOrders: number;
  productsByCategory: { name: string; count: number }[];
  stockDistribution: { range: string; count: number; color: string }[];
  usersByType: { type: string; count: number; color: string }[];
};

export default function AnalisisSitioPage() {
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports/sitio")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  const d = data || {
    totalProducts: 0, activeProducts: 0, totalCategories: 0,
    totalUsers: 0, totalOrders: 0, productsByCategory: [],
    stockDistribution: [], usersByType: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Analisis del sitio</h1>
        <p className="text-sm text-muted-foreground">Estado general del catalogo, usuarios y configuracion.</p>
      </div>

      {/* Analytics externo banner */}
      <Card className="border-amber-300 bg-amber-50/50 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Metricas de trafico y SEO</p>
              <p className="text-sm text-amber-800 mt-1">
                Para medir visitantes, tiempo de navegacion, dispositivos, fuentes de trafico y datos de SEO
                necesitas conectar un servicio de analytics externo como <strong>Google Analytics</strong> o <strong>Plausible</strong>.
                Configura el ID de seguimiento en la seccion de Integraciones del admin.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100 gap-2">
            <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />Ir a Google Analytics
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* KPIs reales del sitio */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Productos totales", value: d.totalProducts, icon: BarChart3, color: "text-blue-600" },
          { label: "Productos activos", value: d.activeProducts, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Categorias", value: d.totalCategories, icon: Globe, color: "text-violet-600" },
          { label: "Usuarios registrados", value: d.totalUsers, icon: Users, color: "text-amber-600" },
        ].map((m) => (
          <Card key={m.label} className="border-border shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted"><m.icon className={`size-6 ${m.color}`} /></div>
              <div>
                <p className="text-2xl font-bold">{m.value.toLocaleString("es-AR")}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Productos por categoria */}
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Productos por categoria</CardTitle></CardHeader>
          <CardContent>
            {d.productsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={d.productsByCategory.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={140} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" name="Productos" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sin categorias con productos</p>
            )}
          </CardContent>
        </Card>

        {/* Distribucion de stock */}
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Distribucion de stock</CardTitle></CardHeader>
          <CardContent>
            {d.stockDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={d.stockDistribution} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}>
                    {d.stockDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sin datos de stock</p>
            )}
          </CardContent>
        </Card>

        {/* Usuarios por tipo */}
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Usuarios por tipo</CardTitle></CardHeader>
          <CardContent>
            {d.usersByType.length > 0 ? (
              <div className="space-y-4">
                {d.usersByType.map((u) => (
                  <div key={u.type} className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <Users className="size-5" style={{ color: u.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm"><span className="font-medium">{u.type}</span><span className="font-bold">{u.count}</span></div>
                      <div className="mt-1 h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (u.count / d.totalUsers) * 100)}%`, backgroundColor: u.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sin usuarios</p>
            )}
          </CardContent>
        </Card>

        {/* Pedidos totales info */}
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Resumen general</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <span className="text-sm font-medium text-muted-foreground">Pedidos generados</span>
              <span className="text-2xl font-bold">{d.totalOrders}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <span className="text-sm font-medium text-muted-foreground">Productos inactivos</span>
              <span className="text-2xl font-bold text-amber-600">{d.totalProducts - d.activeProducts}</span>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Para metricas detalladas de trafico (visitantes, sesiones, dispositivos, fuentes, keywords SEO),
                conecta Google Analytics. Los datos apareceran automaticamente en esta seccion.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
