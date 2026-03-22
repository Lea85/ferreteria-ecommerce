"use client";

import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_NAME } from "@/lib/constants";

export function NewsletterForm() {
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
        onSubmit={(e) => e.preventDefault()}
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
        >
          Suscribirme
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Al suscribirte aceptás recibir comunicaciones de {SITE_NAME}.
      </p>
    </div>
  );
}
