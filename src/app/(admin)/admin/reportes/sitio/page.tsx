"use client";

import {
  Chrome, Clock, Globe, Laptop, Monitor, MousePointerClick,
  Smartphone, TrendingUp, Users,
} from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Period = "7d" | "15d" | "30d" | "6m" | "1y" | "ytd";

function scale(base: number, period: Period): number {
  const f: Record<Period, number> = { "7d": 0.23, "15d": 0.5, "30d": 1, "6m": 5.5, "1y": 11, "ytd": 3.2 };
  return Math.round(base * f[period]);
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const VISITS_DAILY = [
  { day: "Lun", visitas: 320, pageviews: 890 },
  { day: "Mar", visitas: 410, pageviews: 1120 },
  { day: "Mie", visitas: 380, pageviews: 980 },
  { day: "Jue", visitas: 450, pageviews: 1250 },
  { day: "Vie", visitas: 520, pageviews: 1400 },
  { day: "Sab", visitas: 280, pageviews: 720 },
  { day: "Dom", visitas: 190, pageviews: 510 },
];

const TRAFFIC_SOURCES = [
  { name: "Google (organico)", value: 42, color: "#2563eb" },
  { name: "Directo", value: 22, color: "#16a34a" },
  { name: "Instagram", value: 15, color: "#ec4899" },
  { name: "Facebook", value: 10, color: "#3b82f6" },
  { name: "WhatsApp", value: 7, color: "#22c55e" },
  { name: "Mercado Libre", value: 4, color: "#f59e0b" },
];

const DEVICES = [
  { name: "Mobile", value: 62, icon: Smartphone, color: "#2563eb" },
  { name: "Desktop", value: 31, icon: Monitor, color: "#16a34a" },
  { name: "Tablet", value: 7, icon: Laptop, color: "#f59e0b" },
];

const BROWSERS = [
  { name: "Chrome", value: 58 },
  { name: "Safari", value: 22 },
  { name: "Firefox", value: 8 },
  { name: "Edge", value: 7 },
  { name: "Otros", value: 5 },
];

const TOP_PAGES = [
  { page: "/productos", views: 4520, avgTime: "2:34" },
  { page: "/", views: 3890, avgTime: "1:45" },
  { page: "/productos/rotomartillo-sds-800w", views: 1240, avgTime: "3:12" },
  { page: "/productos/griferia-monocomando", views: 980, avgTime: "2:58" },
  { page: "/carrito", views: 760, avgTime: "1:20" },
  { page: "/checkout/datos", views: 420, avgTime: "4:10" },
];

const SEO_KEYWORDS = [
  { keyword: "ferreteria online buenos aires", position: 3, clicks: 890, impressions: 12400 },
  { keyword: "griferia monocomando precio", position: 5, clicks: 450, impressions: 8200 },
  { keyword: "herramientas electricas", position: 8, clicks: 320, impressions: 15600 },
  { keyword: "alquiler herramientas caba", position: 2, clicks: 280, impressions: 3400 },
  { keyword: "sanitarios buenos aires", position: 6, clicks: 210, impressions: 5800 },
  { keyword: "comprar taladro online", position: 12, clicks: 150, impressions: 9200 },
];

const BOUNCE_BY_PAGE = [
  { page: "Home", rate: 35 },
  { page: "Productos", rate: 28 },
  { page: "Detalle prod.", rate: 22 },
  { page: "Carrito", rate: 15 },
  { page: "Checkout", rate: 8 },
];

export default function AnalisisSitioPage() {
  const [period, setPeriod] = useState<Period>("30d");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analisis del sitio</h1>
          <p className="text-sm text-muted-foreground">Performance, trafico, dispositivos y SEO.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Ultimos 7 dias</SelectItem>
            <SelectItem value="15d">Ultimos 15 dias</SelectItem>
            <SelectItem value="30d">Ultimos 30 dias</SelectItem>
            <SelectItem value="6m">Ultimos 6 meses</SelectItem>
            <SelectItem value="1y">Ultimo año</SelectItem>
            <SelectItem value="ytd">YTD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Visitantes unicos", value: scale(2550, period), icon: Users, color: "text-blue-600" },
          { label: "Paginas vistas", value: scale(8870, period), icon: MousePointerClick, color: "text-emerald-600" },
          { label: "Tiempo promedio", value: "2:18 min", icon: Clock, color: "text-amber-600", raw: true },
          { label: "Tasa de rebote", value: "32%", icon: TrendingUp, color: "text-red-500", raw: true },
        ].map((m) => (
          <Card key={m.label} className="border-border shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex size-12 items-center justify-center rounded-xl bg-muted`}>
                <m.icon className={`size-6 ${m.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{(m as any).raw ? m.value : Number(m.value).toLocaleString("es-AR")}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visitas diarias + Fuentes de trafico */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Visitas diarias</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={VISITS_DAILY}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="visitas" fill="#2563eb" name="Visitantes" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pageviews" fill="#16a34a" name="Paginas vistas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Fuentes de trafico</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={TRAFFIC_SOURCES} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name} ${value}%`}>
                  {TRAFFIC_SOURCES.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Dispositivos + Navegadores */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Dispositivos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {DEVICES.map((d) => (
              <div key={d.name} className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted"><d.icon className="size-5" style={{ color: d.color }} /></div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm"><span className="font-medium">{d.name}</span><span className="font-bold">{d.value}%</span></div>
                  <div className="mt-1 h-2 w-full rounded-full bg-muted"><div className="h-2 rounded-full" style={{ width: `${d.value}%`, backgroundColor: d.color }} /></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Navegadores</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BROWSERS.map((b) => (
              <div key={b.name} className="flex items-center gap-4">
                <Chrome className="size-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm"><span>{b.name}</span><span className="font-bold">{b.value}%</span></div>
                  <div className="mt-1 h-2 w-full rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${b.value}%` }} /></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tasa de rebote por pagina */}
      <Card className="border-border shadow-sm">
        <CardHeader><CardTitle className="text-base">Tasa de rebote por seccion</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={BOUNCE_BY_PAGE} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 50]} tickFormatter={(v) => `${v}%`} fontSize={12} />
              <YAxis dataKey="page" type="category" width={100} fontSize={12} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="rate" fill="#ef4444" name="Tasa de rebote" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Paginas mas visitadas + SEO Keywords */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Paginas mas visitadas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TOP_PAGES.map((p, i) => (
                <div key={p.page} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <span className="font-mono text-xs">{p.page}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{scale(p.views, period).toLocaleString("es-AR")} vistas</span>
                    <Badge variant="outline">{p.avgTime}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="size-5" />SEO - Keywords principales</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {SEO_KEYWORDS.map((k) => (
                <div key={k.keyword} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{k.keyword}</p>
                    <p className="text-xs text-muted-foreground">{scale(k.clicks, period).toLocaleString("es-AR")} clicks · {scale(k.impressions, period).toLocaleString("es-AR")} impresiones</p>
                  </div>
                  <Badge variant={k.position <= 3 ? "default" : k.position <= 10 ? "secondary" : "outline"}>
                    #{k.position}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
