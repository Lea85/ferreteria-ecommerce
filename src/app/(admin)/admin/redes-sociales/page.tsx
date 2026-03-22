"use client";

import { Globe, Instagram, Loader2, MapPin, MessageCircle, Save, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SocialSettings = {
  google_maps_address: string;
  whatsapp_number: string;
  instagram_profile: string;
  mercadolibre_url: string;
};

const DEFAULTS: SocialSettings = {
  google_maps_address: "Av. Caseros 2421, CABA",
  whatsapp_number: "",
  instagram_profile: "",
  mercadolibre_url: "",
};

export default function AdminRedesSocialesPage() {
  const [settings, setSettings] = useState<SocialSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings?keys=google_maps_address,whatsapp_number,instagram_profile,mercadolibre_url")
      .then((r) => r.json())
      .then((data) => {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      })
      .catch(() => toast.error("Error al cargar configuración"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Configuración guardada");
      } else {
        toast.error("Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Redes sociales y contacto</h1>
        <p className="text-sm text-muted-foreground">
          Configurá los enlaces y datos de contacto que se muestran en la tienda.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-5 text-primary" />
              Google Maps
            </CardTitle>
            <CardDescription>
              Dirección que se mostrará en el mapa de la tienda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="maps">Dirección</Label>
              <Input
                id="maps"
                value={settings.google_maps_address}
                onChange={(e) => setSettings((s) => ({ ...s, google_maps_address: e.target.value }))}
                placeholder="Ej: Av. Caseros 2421, CABA"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="size-5 text-emerald-600" />
              WhatsApp
            </CardTitle>
            <CardDescription>
              Número de teléfono para el botón de WhatsApp (con código de país, ej: 5491112345678).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Número de WhatsApp</Label>
              <Input
                id="whatsapp"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings((s) => ({ ...s, whatsapp_number: e.target.value }))}
                placeholder="5491112345678"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Instagram className="size-5 text-pink-600" />
              Instagram
            </CardTitle>
            <CardDescription>
              Nombre de usuario de Instagram (sin @).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="instagram">Perfil de Instagram</Label>
              <Input
                id="instagram"
                value={settings.instagram_profile}
                onChange={(e) => setSettings((s) => ({ ...s, instagram_profile: e.target.value }))}
                placeholder="ferrosan.ok"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="size-5 text-yellow-600" />
              Mercado Libre
            </CardTitle>
            <CardDescription>
              URL completa de tu tienda en Mercado Libre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="meli">URL de Mercado Libre</Label>
              <Input
                id="meli"
                value={settings.mercadolibre_url}
                onChange={(e) => setSettings((s) => ({ ...s, mercadolibre_url: e.target.value }))}
                placeholder="https://www.mercadolibre.com.ar/perfil/ferrosan"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar configuración
        </Button>
      </form>
    </div>
  );
}
