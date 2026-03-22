"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SITE_NAME } from "@/lib/constants";

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

export default function RegistroPage() {
  const router = useRouter();

  const [customerType, setCustomerType] = useState<"consumer" | "pro">("consumer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!termsAccepted) {
      setError("Debés aceptar los términos y condiciones.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const lastName = formData.get("lastname") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;
    const password2 = formData.get("password2") as string;
    const cuit = formData.get("cuit") as string;
    const company = formData.get("company") as string;

    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          lastName,
          email,
          phone,
          password,
          customerType: customerType === "pro" ? "TRADE" : "CONSUMER",
          cuit: customerType === "pro" ? cuit : undefined,
          company: customerType === "pro" ? company : undefined,
          newsletterOptIn,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear la cuenta.");
        setLoading(false);
        return;
      }

      if (data.requiresApproval) {
        setSuccess(
          "¡Cuenta creada! Tu cuenta profesional será revisada por nuestro equipo. " +
          "Te notificaremos cuando esté aprobada.",
        );
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setSuccess("Cuenta creada. Ya podés iniciar sesión.");
        setLoading(false);
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg border-border shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-primary">
          Crear cuenta
        </CardTitle>
        <CardDescription>Registrate en {SITE_NAME}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <RequiredLabel htmlFor="name">Nombre</RequiredLabel>
              <Input id="name" name="name" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <RequiredLabel htmlFor="lastname">Apellido</RequiredLabel>
              <Input id="lastname" name="lastname" required disabled={loading} />
            </div>
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="email">Email</RequiredLabel>
            <Input id="email" name="email" type="email" required disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" type="tel" disabled={loading} />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="password">Contraseña</RequiredLabel>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="password2">Confirmar contraseña</RequiredLabel>
            <Input
              id="password2"
              name="password2"
              type="password"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <RequiredLabel htmlFor="customerType">Tipo de cliente</RequiredLabel>
            <Select
              value={customerType}
              onValueChange={(v) => setCustomerType(v as "consumer" | "pro")}
              disabled={loading}
            >
              <SelectTrigger id="customerType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumer">Consumidor final</SelectItem>
                <SelectItem value="pro">Soy profesional / gremio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {customerType === "pro" && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT</Label>
                <Input id="cuit" name="cuit" placeholder="XX-XXXXXXXX-X" disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Razón social</Label>
                <Input id="company" name="company" disabled={loading} />
              </div>
              <p className="text-xs text-muted-foreground">
                Tu cuenta será verificada por nuestro equipo antes de habilitar
                precios gremio.
              </p>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              disabled={loading}
            />
            <Label htmlFor="terms" className="cursor-pointer text-sm leading-snug">
              Acepto los términos y condiciones y la política de privacidad. <span className="text-destructive">*</span>
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="newsletter"
              checked={newsletterOptIn}
              onCheckedChange={(checked) => setNewsletterOptIn(checked === true)}
              disabled={loading}
            />
            <Label htmlFor="newsletter" className="cursor-pointer text-sm leading-snug">
              Quiero recibir ofertas, novedades y tips por email (newsletter).
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              "Crear cuenta"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
          </p>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          ¿Ya tenés cuenta? Iniciá sesión
        </Link>
      </CardFooter>
    </Card>
  );
}
