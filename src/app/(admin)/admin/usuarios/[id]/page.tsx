"use client";

import { ArrowLeft, CheckCircle2, Edit, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
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
import {
  CUSTOMER_TYPE_LABELS,
  type CustomerType,
  type OrderStatus,
} from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Cliente",
  MOSTRADOR: "Mostrador",
  ADMIN: "Administrador",
  SUPER_ADMIN: "Super administrador",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  EXPIRED: "Vencido",
  SOLD: "Vendido",
  CANCELLED: "Cancelado",
};

type UserDetail = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  customerType: CustomerType;
  role: string;
  isApproved: boolean;
  taxIdType: string | null;
  taxId: string | null;
  companyName: string | null;
  newsletterOptIn: boolean;
  createdAt: string;
  updatedAt: string;
  customerCategories: { id: string; name: string; isActive: boolean }[];
  addresses: {
    id: string;
    label: string | null;
    street: string;
    number: string;
    floor: string | null;
    apartment: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    instructions: string | null;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
  }[];
  recentQuotes: {
    id: string;
    quoteNumber: string;
    status: string;
    total: number;
    createdAt: string;
  }[];
  _count: { orders: number; addresses: number; quotes: number };
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatAddress(a: UserDetail["addresses"][number]) {
  const line1 = [
    a.street,
    a.number,
    a.floor ? `Piso ${a.floor}` : null,
    a.apartment ? `Depto ${a.apartment}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const line2 = [a.city, a.state, a.postalCode].filter(Boolean).join(", ");
  return { line1, line2 };
}

export default function AdminUsuarioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/users/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Error al cargar");
        if (!cancelled) setUser(data.user);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Error al cargar usuario");
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Cliente no encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/admin/usuarios">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  const fullName = [user.name, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/usuarios" aria-label="Volver al listado">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{fullName}</h1>
              {user.isApproved ? (
                <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  <CheckCircle2 className="size-3.5" />
                  Activo
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-amber-700">
                  <XCircle className="size-3.5" />
                  Pendiente
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button
          type="button"
          className="gap-2"
          onClick={() => router.push(`/admin/usuarios?edit=${user.id}`)}
        >
          <Edit className="size-4" />
          Editar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Datos del cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Nombre</p>
                <p className="text-sm font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Apellido</p>
                <p className="text-sm font-medium">{user.lastName || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Teléfono</p>
                <p className="text-sm font-medium">{user.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Tipo de cliente
                </p>
                <p className="text-sm font-medium">
                  {CUSTOMER_TYPE_LABELS[user.customerType] || user.customerType}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Rol</p>
                <p className="text-sm font-medium">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>
              {user.companyName ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Razón social
                  </p>
                  <p className="text-sm font-medium">{user.companyName}</p>
                </div>
              ) : null}
              {user.taxId ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {user.taxIdType || "Documento"}
                  </p>
                  <p className="font-mono text-sm font-medium">{user.taxId}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium text-muted-foreground">Newsletter</p>
                <p className="text-sm font-medium">
                  {user.newsletterOptIn ? "Suscripto" : "No suscripto"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Alta</p>
                <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                Direcciones ({user._count.addresses})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin direcciones cargadas.</p>
              ) : (
                <div className="space-y-3">
                  {user.addresses.map((address) => {
                    const formatted = formatAddress(address);
                    return (
                      <div
                        key={address.id}
                        className="rounded-lg border border-border px-3 py-2"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">
                            {address.label || "Dirección"}
                          </p>
                          {address.isDefault ? (
                            <Badge variant="secondary" className="text-xs">
                              Predeterminada
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm">{formatted.line1}</p>
                        <p className="text-sm text-muted-foreground">{formatted.line2}</p>
                        {address.instructions ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {address.instructions}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Últimas ventas ({user._count.orders})
              </CardTitle>
              {user._count.orders > 0 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/pedidos?search=${encodeURIComponent(user.email)}`}>
                    Ver todas
                  </Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {user.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Venta</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Link
                              href={`/admin/pedidos/${order.id}`}
                              className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={order.status as OrderStatus} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(order.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Últimos presupuestos ({user._count.quotes})
              </CardTitle>
              {user._count.quotes > 0 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/presupuestos">Ver listado</Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {user.recentQuotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin presupuestos.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Presupuesto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.recentQuotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell>
                            <Link
                              href={`/admin/presupuestos/${quote.id}`}
                              className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                            >
                              {quote.quoteNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {QUOTE_STATUS_LABELS[quote.status] || quote.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(quote.createdAt)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(quote.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Ventas</span>
                <span className="font-semibold">{user._count.orders}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Presupuestos</span>
                <span className="font-semibold">{user._count.quotes}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Direcciones</span>
                <span className="font-semibold">{user._count.addresses}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Categorías de cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {user.customerCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin categorías asignadas.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {user.customerCategories.map((cat) => (
                    <Badge
                      key={cat.id}
                      variant={cat.isActive ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {cat.name}
                      {!cat.isActive ? " (inactiva)" : ""}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
