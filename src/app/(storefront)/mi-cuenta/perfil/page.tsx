"use client";

import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { changePasswordSchema, updateProfileSchema } from "@/lib/validators/auth.validator";

type ProfileData = {
  name: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  customerType: CustomerType;
};

export default function PerfilPage() {
  const { data: session, status, update } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean | null>(null);
  const [nlLoading, setNlLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    Promise.all([
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/newsletter").then((r) => r.json()),
    ])
      .then(([profileData, newsletterData]) => {
        if (profileData.profile) setProfile(profileData.profile);
        setNewsletterSubscribed(newsletterData.subscribed ?? false);
      })
      .catch(() => {
        setNewsletterSubscribed(false);
      })
      .finally(() => setProfileLoading(false));
  }, [status]);

  if (status === "loading" || profileLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const customerType = profile?.customerType ?? (session?.user as { customerType?: CustomerType })?.customerType;
  const badgeLabel = customerType
    ? CUSTOMER_TYPE_LABELS[customerType]
    : "Consumidor final";

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("nombre") ?? ""),
      lastName: String(formData.get("apellido") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    };

    const parsed = updateProfileSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "No se pudieron guardar los cambios.");
        return;
      }

      setProfile(data.profile);
      await update({ name: `${data.profile.name} ${data.profile.lastName ?? ""}`.trim() });
      toast.success("Perfil actualizado.");
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      currentPassword: String(formData.get("current") ?? ""),
      newPassword: String(formData.get("newp") ?? ""),
      newPassword2: String(formData.get("newp2") ?? ""),
    };

    const parsed = changePasswordSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "No se pudo actualizar la contraseña.");
        return;
      }

      (e.target as HTMLFormElement).reset();
      toast.success("Contraseña actualizada.");
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setSavingPassword(false);
    }
  }

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
      toast.error("Error al actualizar la suscripción.");
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
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  defaultValue={profile?.name ?? ""}
                  required
                  disabled={savingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  name="apellido"
                  defaultValue={profile?.lastName ?? ""}
                  required
                  disabled={savingProfile}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={profile?.email ?? session?.user?.email ?? ""}
                readOnly
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile?.phone ?? ""}
                disabled={savingProfile}
              />
            </div>
            <Button type="submit" className="bg-primary" disabled={savingProfile}>
              {savingProfile ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
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
          <p className="mb-4 text-sm text-muted-foreground">
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
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <Label htmlFor="current">Contraseña actual</Label>
              <Input id="current" name="current" type="password" required disabled={savingPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newp">Nueva contraseña</Label>
              <Input id="newp" name="newp" type="password" minLength={8} required disabled={savingPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newp2">Repetir nueva contraseña</Label>
              <Input id="newp2" name="newp2" type="password" minLength={8} required disabled={savingPassword} />
            </div>
            <Button type="submit" variant="secondary" disabled={savingPassword}>
              {savingPassword ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar contraseña"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
