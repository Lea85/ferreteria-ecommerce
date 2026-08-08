"use client";

import {
  Building2,
  ChevronDown,
  CreditCard,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Save,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { MercadoPagoIntegrationPanel } from "@/components/admin/MercadoPagoIntegrationPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Settings = Record<string, string>;

type SectionDef = {
  key: string;
  title: string;
  icon: React.ReactNode;
  fields?: { key: string; label: string; placeholder: string }[];
  custom?: boolean;
};

const SECTIONS: SectionDef[] = [
  {
    key: "identity",
    title: "Identidad de la tienda",
    icon: <Store className="size-5 text-primary" />,
    fields: [
      { key: "store_name", label: "Nombre de la tienda", placeholder: "FerroSan" },
      {
        key: "store_logo_url",
        label: "URL del logo (tambien se usa como favicon)",
        placeholder: "https://ejemplo.com/logo.png",
      },
      {
        key: "quote_validity_days",
        label: "Dias habiles de validez de presupuestos",
        placeholder: "7",
      },
    ],
  },
  {
    key: "maps",
    title: "Google Maps",
    icon: <MapPin className="size-5 text-primary" />,
    fields: [
      { key: "google_maps_address", label: "Direccion de la tienda", placeholder: "Av. Caseros 2421, CABA" },
      {
        key: "google_maps_api_key",
        label: "API Key (Places Autocomplete en checkout)",
        placeholder: "AIza...",
      },
    ],
  },
  {
    key: "correo",
    title: "Correo Argentino (validación CPA)",
    icon: <MapPin className="size-5 text-amber-600" />,
    fields: [
      {
        key: "correo_argentino_api_base_url",
        label: "URL base API",
        placeholder: "https://webservices.correoargentino.com.ar",
      },
      { key: "correo_argentino_agreement_id", label: "Agreement ID", placeholder: "ID comercial" },
      { key: "correo_argentino_api_key", label: "API Key", placeholder: "Clave corporativa" },
    ],
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    icon: <MessageCircle className="size-5 text-emerald-600" />,
    fields: [
      { key: "whatsapp_number", label: "Numero de WhatsApp", placeholder: "5491112345678" },
      {
        key: "whatsapp_message",
        label: "Mensaje precargado",
        placeholder: "Hola, queria consultar por: ",
      },
      {
        key: "whatsapp_floating",
        label: "Mostrar siempre (boton flotante en la tienda)",
        placeholder: "true",
      },
    ],
  },
  {
    key: "instagram",
    title: "Instagram",
    icon: <Instagram className="size-5 text-pink-600" />,
    fields: [{ key: "instagram_profile", label: "Perfil de Instagram (sin @)", placeholder: "ferrosan.ok" }],
  },
  {
    key: "mercadolibre",
    title: "Mercado Libre",
    icon: <ShoppingBag className="size-5 text-yellow-600" />,
    fields: [
      {
        key: "mercadolibre_url",
        label: "URL de Mercado Libre",
        placeholder: "https://www.mercadolibre.com.ar/perfil/ferrosan",
      },
    ],
  },
  {
    key: "contact",
    title: "Email de contacto",
    icon: <Mail className="size-5 text-blue-600" />,
    fields: [
      {
        key: "contact_email",
        label: "Email donde se reciben los mensajes del formulario de contacto",
        placeholder: "ventas@ferrosan.com.ar",
      },
    ],
  },
  {
    key: "bank",
    title: "Datos bancarios (transferencia)",
    icon: <Building2 className="size-5 text-indigo-600" />,
    fields: [
      { key: "bank_name", label: "Nombre del banco", placeholder: "Banco Galicia" },
      { key: "bank_account_type", label: "Tipo de cuenta", placeholder: "Cuenta corriente en pesos" },
      { key: "bank_cbu", label: "CBU", placeholder: "00701234-0000000000123456" },
      { key: "bank_alias", label: "Alias", placeholder: "FERROSAN.VENTAS" },
      { key: "bank_holder", label: "Titular", placeholder: "FerroSan SRL" },
      { key: "bank_email", label: "Email para comprobantes", placeholder: "ventas@ferrosan.com.ar" },
    ],
  },
  {
    key: "mercadopago",
    title: "Mercado Pago",
    icon: <CreditCard className="size-5 text-sky-600" />,
    custom: true,
  },
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields?.map((f) => f.key) ?? []);

function IntegracionesContent() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<Settings>({});
  const [original, setOriginal] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mpPanelKey, setMpPanelKey] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/settings?keys=${ALL_KEYS.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        const vals = data.settings || {};
        setSettings(vals);
        setOriginal(vals);
      })
      .catch(() => toast.error("Error al cargar configuracion"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const section = searchParams.get("section");
    if (section && SECTIONS.some((s) => s.key === section)) {
      setOpenSection(section);
    }
  }, [searchParams]);

  function closeSection() {
    setOpenSection(null);
  }

  function toggleSection(key: string) {
    if (openSection === key) {
      if (key !== "mercadopago") {
        setSettings({ ...original });
      } else {
        setMpPanelKey((k) => k + 1);
      }
      closeSection();
      toast.info("Cambios descartados. La informacion no fue guardada.");
    } else {
      setOpenSection(key);
    }
  }

  function cancelSection() {
    if (openSection !== "mercadopago") {
      setSettings({ ...original });
    } else {
      setMpPanelKey((k) => k + 1);
    }
    closeSection();
    toast.info("La informacion no fue guardada.");
  }

  async function saveSection(section: SectionDef) {
    if (!section.fields) return;

    setSaving(true);
    try {
      const partial: Record<string, string> = {};
      for (const f of section.fields) partial[f.key] = settings[f.key] || "";

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });

      if (res.ok) {
        setOriginal((prev) => ({ ...prev, ...partial }));
        toast.success("Configuracion guardada correctamente.");
        closeSection();
      } else toast.error("Error al guardar.");
    } catch {
      toast.error("Error de conexion.");
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
        <h1 className="text-xl font-bold text-foreground">Integraciones</h1>
        <p className="text-sm text-muted-foreground">
          Configura la identidad de la tienda, redes sociales, medios de pago e integraciones externas.
        </p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const isOpen = openSection === section.key;
          return (
            <div
              key={section.key}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
              >
                {section.icon}
                <span className="flex-1 font-semibold text-foreground">{section.title}</span>
                <ChevronDown
                  className={cn(
                    "size-5 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && section.custom && section.key === "mercadopago" && (
                <div className="border-t border-border px-5 pb-5 pt-4">
                  <MercadoPagoIntegrationPanel
                    key={mpPanelKey}
                    onCancel={closeSection}
                  />
                </div>
              )}

              {isOpen && section.fields && (
                <div className="space-y-4 border-t border-border px-5 pb-5 pt-4">
                  {section.fields.map((field) => {
                    const isToggle = field.placeholder === "true";
                    if (isToggle) {
                      return (
                        <div
                          key={field.key}
                          className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
                        >
                          <Label htmlFor={field.key} className="cursor-pointer">
                            {field.label}
                          </Label>
                          <Switch
                            id={field.key}
                            checked={settings[field.key] === "true"}
                            onCheckedChange={(v) =>
                              setSettings((s) => ({ ...s, [field.key]: v ? "true" : "false" }))
                            }
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <Input
                          id={field.key}
                          value={settings[field.key] || ""}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, [field.key]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                        />
                        {field.key === "store_logo_url" && settings.store_logo_url && (
                          <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
                            <img
                              src={settings.store_logo_url}
                              alt="Logo preview"
                              className="size-16 rounded-lg border border-border bg-white object-contain p-1"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <div className="text-xs text-muted-foreground">
                              <p className="font-medium text-foreground">Vista previa del logo</p>
                              <p>
                                Se mostrara en el header de la tienda y como favicon del navegador.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={cancelSection}
                      className="gap-2"
                      disabled={saving}
                    >
                      <X className="size-4" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => saveSection(section)}
                      disabled={saving}
                      className="gap-2"
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminIntegracionesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <IntegracionesContent />
    </Suspense>
  );
}
