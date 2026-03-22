"use client";

import Link from "next/link";
import { Instagram, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { SITE_NAME } from "@/lib/constants";

type Settings = Record<string, string>;

export function Footer() {
  const [s, setS] = useState<Settings>({ google_maps_address: "Av. Caseros 2421, CABA" });

  useEffect(() => {
    fetch("/api/settings/public?keys=google_maps_address,whatsapp_number,whatsapp_message,instagram_profile,mercadolibre_url")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setS((prev) => ({ ...prev, ...d.settings })); })
      .catch(() => {});
  }, []);

  const addr = s.google_maps_address || "Av. Caseros 2421, CABA";
  const mapsQuery = encodeURIComponent(addr);
  const mapsEmbedUrl = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;
  const mapsLinkUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const waMsg = s.whatsapp_message || "Hola, queria consultar por: ";
  const waUrl = s.whatsapp_number ? `https://wa.me/${s.whatsapp_number}?text=${encodeURIComponent(waMsg)}` : null;

  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <h3 className="text-lg font-bold text-foreground">{SITE_NAME}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ferreteria y casa de sanitarios. Todo lo que necesitas para tu obra y tu hogar.
            </p>

            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contactanos</p>
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700">
                  <MessageCircle className="size-5 text-emerald-600 shrink-0" />
                  <div><p className="font-semibold">WhatsApp</p><p className="text-xs text-muted-foreground">Escribinos por WhatsApp</p></div>
                </a>
              )}
              {s.instagram_profile && (
                <a href={`https://instagram.com/${s.instagram_profile}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-pink-50 hover:border-pink-200 hover:text-pink-700">
                  <Instagram className="size-5 text-pink-600 shrink-0" />
                  <div><p className="font-semibold">Instagram</p><p className="text-xs text-muted-foreground">@{s.instagram_profile}</p></div>
                </a>
              )}
              {s.mercadolibre_url && (
                <a href={s.mercadolibre_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700">
                  <ShoppingBag className="size-5 text-yellow-600 shrink-0" />
                  <div><p className="font-semibold">Mercado Libre</p><p className="text-xs text-muted-foreground">Nuestra tienda oficial</p></div>
                </a>
              )}
            </div>

            <nav className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground">Inicio</Link>
              <Link href="/productos" className="text-muted-foreground hover:text-foreground">Productos</Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">Mi cuenta</Link>
            </nav>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="size-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Nuestra ubicacion</h3>
            </div>
            <a href={mapsLinkUrl} target="_blank" rel="noopener noreferrer"
              className="mb-3 inline-block text-sm text-muted-foreground hover:text-primary hover:underline">
              {addr}
            </a>
            <div className="overflow-hidden rounded-xl border border-border shadow-sm">
              <iframe title="Ubicacion de la tienda" src={mapsEmbedUrl} width="100%" height="300"
                style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
