"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import type { CustomerType } from "@/lib/constants";

export default function PerfilPage() {
  const { data: session, status } = useSession();
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean | null>(null);
  const [nlLoading, setNlLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/newsletter")
        .then((r) => r.json())
        .then((d) => setNewsletterSubscribed(d.subscribed))
        .catch(() => setNewsletterSubscribed(false));
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const user = session?.user;
  const nameParts = (user?.name ?? "").split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";
  const customerType = (user as any)?.customerType as CustomerType | undefined;
  const badgeLabel = customerType
    ? CUSTOMER_TYPE_LABELS[customerType]
    : "Consumidor final";

  async function toggleNewsletter() {
    setNlLoading(true);
    try {
      if (newsletterSubscribed) {
        await fetch("/api/newsletter", { method: "DELETE" });
        setNewsletterSubscribed(false);
      } else {
        await fetch("/api/newsletter", { method: "POST" });
        setNewsletterSubscribed(true);
      }
    } catch {
      // silently fail
    } finally {
      setNlLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Mi perfil</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Actualizá tus datos personales.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Datos de la cuenta</CardTitle>
          <Badge variant="secondary">{badgeLabel}</Badge>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" defaultValue={firstName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" defaultValue={lastName} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user?.email ?? ""}
                readOnly
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" type="tel" />
            </div>
            <Button type="submit" className="bg-primary">
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Newsletter</CardTitle>
          {newsletterSubscribed !== null && (
            <Badge variant={newsletterSubscribed ? "default" : "outline"}>
              {newsletterSubscribed ? "Suscripto" : "No suscripto"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {newsletterSubscribed
              ? "Estás recibiendo nuestras ofertas, novedades y tips por email."
              : "No estás suscripto al newsletter. Activalo para recibir ofertas y novedades."}
          </p>
          <Button
            variant={newsletterSubscribed ? "outline" : "default"}
            onClick={toggleNewsletter}
            disabled={nlLoading || newsletterSubscribed === null}
            className="gap-2"
          >
            {nlLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : newsletterSubscribed ? (
              <BellOff className="size-4" />
            ) : (
              <Bell className="size-4" />
            )}
            {newsletterSubscribed ? "Cancelar suscripción" : "Suscribirme al newsletter"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="current">Contraseña actual</Label>
              <Input id="current" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newp">Nueva contraseña</Label>
              <Input id="newp" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newp2">Repetir nueva contraseña</Label>
              <Input id="newp2" type="password" />
            </div>
            <Button type="submit" variant="secondary">
              Actualizar contraseña
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
