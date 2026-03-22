"use client";

import Link from "next/link";
import { Instagram, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { SITE_NAME } from "@/lib/constants";

type SocialSettings = {
  google_maps_address?: string;
  whatsapp_number?: string;
  instagram_profile?: string;
  mercadolibre_url?: string;
};

export function Footer() {
  const [social, setSocial] = useState<SocialSettings>({
    google_maps_address: "Av. Caseros 2421, CABA",
  });

  useEffect(() => {
    fetch("/api/settings/public?keys=google_maps_address,whatsapp_number,instagram_profile,mercadolibre_url")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSocial((prev) => ({ ...prev, ...d.settings }));
      })
      .catch(() => {});
  }, []);

  const mapsQuery = encodeURIComponent(social.google_maps_address || "Av. Caseros 2421, CABA");
  const mapsEmbedUrl = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;
  const mapsLinkUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">{SITE_NAME}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ferretería y casa de sanitarios. Todo lo que necesitás para tu obra y tu hogar.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {social.whatsapp_number && (
                <a
                  href={`https://wa.me/${social.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                >
                  <MessageCircle className="size-5 text-emerald-600" />
                  WhatsApp
                </a>
              )}
              {social.instagram_profile && (
                <a
                  href={`https://instagram.com/${social.instagram_profile}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-pink-50 hover:border-pink-200 hover:text-pink-700"
                >
                  <Instagram className="size-5 text-pink-600" />
                  Instagram
                </a>
              )}
              {social.mercadolibre_url && (
                <a
                  href={social.mercadolibre_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700"
                >
                  <ShoppingBag className="size-5 text-yellow-600" />
                  Mercado Libre
                </a>
              )}
            </div>

            <nav className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground">Inicio</Link>
              <Link href="/productos" className="text-muted-foreground hover:text-foreground">Productos</Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">Mi cuenta</Link>
            </nav>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="size-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Nuestra ubicación</h3>
            </div>
            <a
              href={mapsLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 inline-block text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              {social.google_maps_address || "Av. Caseros 2421, CABA"}
            </a>
            <div className="overflow-hidden rounded-xl border border-border shadow-sm">
              <iframe
                title="Ubicación de la tienda"
                src={mapsEmbedUrl}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
