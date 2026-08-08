"use client";

import { ExternalLink, Loader2, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type MercadoPagoAdminConfig = {
  enabled: boolean;
  publicKey: string;
  sandbox: boolean;
  hasAccessToken: boolean;
  accessTokenMasked: string;
  webhookUrl: string;
};

type MercadoPagoIntegrationPanelProps = {
  onCancel: () => void;
};

export function MercadoPagoIntegrationPanel({ onCancel }: MercadoPagoIntegrationPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<MercadoPagoAdminConfig | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [sandbox, setSandbox] = useState(false);

  async function loadConfig() {
    setLoading(true);
    try {
      const data = await fetch("/api/admin/mercadopago").then((r) => r.json());
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setConfig(data);
      setEnabled(Boolean(data.enabled));
      setPublicKey(data.publicKey || "");
      setSandbox(Boolean(data.sandbox));
      setAccessToken("");
    } catch {
      toast.error("Error al cargar Mercado Pago");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  function handleCancel() {
    if (config) {
      setEnabled(Boolean(config.enabled));
      setPublicKey(config.publicKey || "");
      setSandbox(Boolean(config.sandbox));
      setAccessToken("");
    }
    onCancel();
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/mercadopago", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          publicKey,
          accessToken: accessToken.trim() || undefined,
          sandbox,
        }),
      });

      if (res.ok) {
        toast.success("Mercado Pago guardado correctamente.");
        setAccessToken("");
        const refreshed = await fetch("/api/admin/mercadopago").then((r) => r.json());
        setConfig(refreshed);
        setEnabled(Boolean(refreshed.enabled));
        setPublicKey(refreshed.publicKey || "");
        setSandbox(Boolean(refreshed.sandbox));
        onCancel();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al guardar.");
      }
    } catch {
      toast.error("Error de conexion.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div>
          <Label htmlFor="mp-enabled" className="cursor-pointer font-medium">
            Habilitar Mercado Pago en checkout
          </Label>
          <p className="text-xs text-muted-foreground">
            Los clientes podran pagar con tarjeta, debito o dinero en cuenta.
          </p>
        </div>
        <Switch id="mp-enabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div>
          <Label htmlFor="mp-sandbox" className="cursor-pointer font-medium">
            Modo prueba (sandbox)
          </Label>
          <p className="text-xs text-muted-foreground">
            Usa credenciales de prueba de Mercado Pago Developers.
          </p>
        </div>
        <Switch id="mp-sandbox" checked={sandbox} onCheckedChange={setSandbox} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mp-public-key">Public Key</Label>
        <Input
          id="mp-public-key"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
        <p className="text-xs text-muted-foreground">
          Clave publica de tu aplicacion en{" "}
          <a
            href="https://www.mercadopago.com.ar/developers/panel/app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline"
          >
            Mercado Pago Developers
            <ExternalLink className="size-3" />
          </a>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mp-access-token">Access Token</Label>
        <Input
          id="mp-access-token"
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder={
            config?.hasAccessToken
              ? `Guardado (${config.accessTokenMasked}) — dejar vacio para mantener`
              : "APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          }
        />
        <p className="text-xs text-muted-foreground">
          Token privado. Solo se usa en el servidor; no se expone al navegador.
        </p>
      </div>

      {config?.webhookUrl && (
        <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-4">
          <Label>URL de notificaciones (webhook)</Label>
          <p className="break-all font-mono text-xs text-foreground">{config.webhookUrl}</p>
          <p className="text-xs text-muted-foreground">
            Configurala en tu aplicacion de Mercado Pago para recibir avisos de pago aprobado o
            rechazado.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={handleCancel} className="gap-2" disabled={saving}>
          <X className="size-4" />
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
