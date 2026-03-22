"use client";

import { Mail, Check, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_NAME } from "@/lib/constants";

export function NewsletterForm() {
  const { data: session, status } = useSession();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isLoggedIn = status === "authenticated" && !!session?.user;

  useEffect(() => {
    if (isLoggedIn) {
      fetch("/api/newsletter")
        .then((r) => r.json())
        .then((d) => setSubscribed(d.subscribed))
        .catch(() => setSubscribed(false));
    }
  }, [isLoggedIn]);

  if (isLoggedIn && subscribed === true) {
    return null;
  }

  async function handleSubscribeLoggedIn() {
    setLoading(true);
    try {
      await fetch("/api/newsletter", { method: "POST" });
      setSubscribed(true);
      setDone(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnonymous(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-100">
          <Check className="size-6 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-emerald-900">¡Suscripción exitosa!</h2>
        <p className="mt-2 text-sm text-emerald-700">
          Vas a recibir las mejores ofertas y novedades de {SITE_NAME}.
        </p>
      </div>
    );
  }

  if (isLoggedIn && subscribed === false) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
        <h2 className="text-xl font-bold text-foreground md:text-2xl">
          Newsletter
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Recibí ofertas, novedades y tips para tu obra. Sin spam.
        </p>
        <Button
          className="mt-6 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
          onClick={handleSubscribeLoggedIn}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Suscribiendo...
            </>
          ) : (
            <>
              <Mail className="mr-2 size-4" />
              Suscribirme al newsletter
            </>
          )}
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          Al suscribirte aceptás recibir comunicaciones de {SITE_NAME}.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h2 className="text-center text-xl font-bold text-foreground md:text-2xl">
        Newsletter
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Recibí ofertas, novedades y tips para tu obra. Sin spam.
      </p>
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={handleSubmitAnonymous}
      >
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            required
            placeholder="Tu email"
            className="pl-9"
            name="email"
          />
        </div>
        <Button
          type="submit"
          className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
          disabled={loading}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Suscribirme"}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Al suscribirte aceptás recibir comunicaciones de {SITE_NAME}.
      </p>
    </div>
  );
}
