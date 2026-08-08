"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { LegalDocumentDialog } from "@/components/storefront/LegalDocumentDialog";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStoreConfig } from "@/contexts/store-config";
import { registerFormSchema } from "@/lib/validators/auth.validator";
import { credentialsLogin } from "@/lib/credentials-login";

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

export default function RegistroPage() {
  const router = useRouter();
  const { storeName } = useStoreConfig();

  const [customerType, setCustomerType] = useState<"consumer" | "pro">("consumer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cuit, setCuit] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  function formatCuit(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }

  useEffect(() => {
    fetch("/api/auth/oauth-available")
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(Boolean(d.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      lastName: String(formData.get("lastname") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
      password2: String(formData.get("password2") ?? ""),
      customerType: customerType === "pro" ? "TRADE" : "CONSUMER",
      cuit: customerType === "pro" ? cuit : "",
      company: customerType === "pro" ? String(formData.get("company") ?? "") : "",
      termsAccepted: termsAccepted as true,
      newsletterOptIn,
    };

    const parsed = registerFormSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá los datos del formulario.");
      return;
    }

    setLoading(true);

    try {
      const { password2: _pw2, ...registerBody } = parsed.data;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerBody),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear la cuenta.");
        setLoading(false);
        return;
      }

      if (data.requiresApproval) {
        setSuccess(
          "Cuenta creada. Tu solicitud profesional quedó registrada y será revisada por nuestro equipo. " +
            "Cuando sea aprobada podrás iniciar sesión con tu email y contraseña.",
        );
        setLoading(false);
        return;
      }

      const loginResult = await credentialsLogin(
        data.email ?? parsed.data.email.toLowerCase().trim(),
        parsed.data.password,
        "/",
      );

      if (!loginResult.ok) {
        setSuccess("Cuenta creada. Ya podés iniciar sesión.");
        setLoading(false);
        setTimeout(() => router.push("/login"), 2000);
        return;
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <>
      <Card className="w-full max-w-lg border-border shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Crear cuenta
          </CardTitle>
          <CardDescription>Registrate en {storeName}</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
              {success}
            </div>
          ) : (
          <>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
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
                minLength={8}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
            <div className="space-y-2">
              <RequiredLabel htmlFor="password2">Confirmar contraseña</RequiredLabel>
              <Input
                id="password2"
                name="password2"
                type="password"
                required
                minLength={8}
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
                  <RequiredLabel htmlFor="cuit">CUIT</RequiredLabel>
                  <Input
                    id="cuit"
                    name="cuit"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="20-12345678-3"
                    value={cuit}
                    onChange={(e) => setCuit(formatCuit(e.target.value))}
                    maxLength={13}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: 2 dígitos - 8 dígitos - 1 dígito (ej: 20-12345678-3).
                  </p>
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="company">Razón social</RequiredLabel>
                  <Input id="company" name="company" required disabled={loading} />
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
                Acepto los{" "}
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  términos y condiciones
                </button>{" "}
                y la{" "}
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  política de privacidad
                </button>
                . <span className="text-destructive">*</span>
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

            <p className="text-center text-xs text-muted-foreground">
              Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
            </p>
          </form>

          {googleEnabled && (
            <>
              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  o
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading}
              >
                Registrarse con Google
              </Button>
            </>
          )}
          </>
          )}
        </CardContent>
        <CardFooter className="justify-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            ¿Ya tenés cuenta? Iniciá sesión
          </Link>
        </CardFooter>
      </Card>

      <LegalDocumentDialog
        open={termsOpen}
        onOpenChange={setTermsOpen}
        slug="terminos-registro"
        fallbackTitle="Términos y condiciones de registro"
      />
      <LegalDocumentDialog
        open={privacyOpen}
        onOpenChange={setPrivacyOpen}
        slug="politica-privacidad"
        fallbackTitle="Política de privacidad"
      />
    </>
  );
}
