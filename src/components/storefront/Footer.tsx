"use client";

import Link from "next/link";
import { Instagram, Loader2, Mail, MapPin, MessageCircle, Send, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SITE_NAME } from "@/lib/constants";

type Settings = Record<string, string>;

export function Footer() {
  const [s, setS] = useState<Settings>({ google_maps_address: "Av. Caseros 2421, CABA" });
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/settings/public?keys=google_maps_address,whatsapp_number,whatsapp_message,instagram_profile,mercadolibre_url,contact_email")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setS((prev) => ({ ...prev, ...d.settings })); })
      .catch(() => {});
  }, []);

  const addr = s.google_maps_address || "Av. Caseros 2421, CABA";
  const mapsQuery = encodeURIComponent(addr);
  const mapsEmbedUrl = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;
  const mapsLinkUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const waMsg = s.whatsapp_message || "Hola, queria consultar por: ";
  const waNumber = s.whatsapp_number || "5491112345678";
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`;
  const igProfile = s.instagram_profile || "ferrosan.ok";
  const meliUrl = s.mercadolibre_url || "https://www.mercadolibre.com.ar";

  async function handleContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error("Completa nombre, email y mensaje.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Mensaje enviado correctamente.");
        setContactForm({ name: "", email: "", phone: "", message: "" });
        setSent(true);
      } else {
        toast.error(data.error || "Error al enviar.");
      }
    } catch {
      toast.error("Error de conexion.");
    } finally {
      setSending(false);
    }
  }

  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Columna 1: Redes sociales + nav */}
          <div>
            <h3 className="text-lg font-bold text-foreground">{SITE_NAME}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ferreteria y casa de sanitarios. Todo lo que necesitas para tu obra y tu hogar.
            </p>

            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contactanos</p>

              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700">
                <MessageCircle className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Escribinos por WhatsApp</p>
                </div>
              </a>

              <a href={`https://instagram.com/${igProfile}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-pink-50 hover:border-pink-200 hover:text-pink-700">
                <Instagram className="size-5 text-pink-600 shrink-0" />
                <div>
                  <p className="font-semibold">Instagram</p>
                  <p className="text-xs text-muted-foreground">@{igProfile}</p>
                </div>
              </a>

              <a href={meliUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700">
                <ShoppingBag className="size-5 text-yellow-600 shrink-0" />
                <div>
                  <p className="font-semibold">Mercado Libre</p>
                  <p className="text-xs text-muted-foreground">Nuestra tienda oficial</p>
                </div>
              </a>

              {s.contact_email && (
                <a href={`mailto:${s.contact_email}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700">
                  <Mail className="size-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-xs text-muted-foreground">{s.contact_email}</p>
                  </div>
                </a>
              )}
            </div>

            <nav className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground">Inicio</Link>
              <Link href="/productos" className="text-muted-foreground hover:text-foreground">Productos</Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">Mi cuenta</Link>
            </nav>
          </div>

          {/* Columna 2: Formulario de contacto */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Send className="size-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Envianos un mensaje</h3>
            </div>
            {sent ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
                <Mail className="mx-auto size-10 text-emerald-500" />
                <p className="mt-3 font-semibold text-emerald-900">Mensaje enviado</p>
                <p className="mt-1 text-sm text-emerald-700">Te responderemos a la brevedad.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setSent(false)}>Enviar otro</Button>
              </div>
            ) : (
              <form onSubmit={handleContact} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name" className="text-xs">Nombre <span className="text-destructive">*</span></Label>
                  <Input id="contact-name" placeholder="Tu nombre" value={contactForm.name}
                    onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-email" className="text-xs">Email <span className="text-destructive">*</span></Label>
                  <Input id="contact-email" type="email" placeholder="tu@email.com" value={contactForm.email}
                    onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-phone" className="text-xs">Telefono</Label>
                  <Input id="contact-phone" type="tel" placeholder="Opcional" value={contactForm.phone}
                    onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-msg" className="text-xs">Mensaje <span className="text-destructive">*</span></Label>
                  <Textarea id="contact-msg" placeholder="En que podemos ayudarte?" rows={3} value={contactForm.message}
                    onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))} required />
                </div>
                <Button type="submit" disabled={sending} className="w-full gap-2">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Enviar mensaje
                </Button>
              </form>
            )}
          </div>

          {/* Columna 3: Mapa */}
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
              <iframe title="Ubicacion de la tienda" src={mapsEmbedUrl} width="100%" height="280"
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
