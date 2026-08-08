"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { GooglePlacesAddressInput } from "@/components/checkout/GooglePlacesAddressInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CheckoutAddressDraft } from "@/lib/checkout-shipping";
import { cn } from "@/lib/utils";

type PostalValidation = {
  valid: boolean;
  message: string;
  loading: boolean;
};

type CheckoutShippingAddressFormProps = {
  value: CheckoutAddressDraft;
  onChange: (next: CheckoutAddressDraft) => void;
  googleMapsApiKey?: string;
  showSaveOptions?: boolean;
};

export function CheckoutShippingAddressForm({
  value,
  onChange,
  googleMapsApiKey,
  showSaveOptions = true,
}: CheckoutShippingAddressFormProps) {
  const [postalValidation, setPostalValidation] = useState<PostalValidation>({
    valid: false,
    message: "",
    loading: false,
  });

  const patch = useCallback(
    (partial: Partial<CheckoutAddressDraft>) => {
      onChange({ ...value, ...partial });
    },
    [onChange, value],
  );

  const validatePostalCode = useCallback(async () => {
    const code = value.postalCode.trim();
    if (!code) {
      setPostalValidation({ valid: false, message: "", loading: false });
      return;
    }

    setPostalValidation((prev) => ({ ...prev, loading: true }));
    try {
      const params = new URLSearchParams({ code });
      if (value.city.trim()) params.set("city", value.city.trim());
      if (value.state.trim()) params.set("state", value.state.trim());

      const res = await fetch(`/api/postal-code/validate?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setPostalValidation({
          valid: false,
          message: data.error ?? "No se pudo validar el código postal.",
          loading: false,
        });
        return;
      }

      setPostalValidation({
        valid: Boolean(data.valid),
        message: String(data.message ?? ""),
        loading: false,
      });

      if (data.valid && data.normalized && data.normalized !== code) {
        patch({ postalCode: data.normalized });
      }
    } catch {
      setPostalValidation({
        valid: false,
        message: "Error al validar el código postal.",
        loading: false,
      });
    }
  }, [patch, value.city, value.postalCode, value.state]);

  useEffect(() => {
    const t = setTimeout(() => {
      void validatePostalCode();
    }, 450);
    return () => clearTimeout(t);
  }, [validatePostalCode]);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
      <div className="space-y-2">
        <Label htmlFor="ship-label">Nombre de la dirección</Label>
        <Input
          id="ship-label"
          value={value.label}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder="Casa, Obra, Depósito…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <Label htmlFor="ship-street">Calle</Label>
          <GooglePlacesAddressInput
            id="ship-street"
            apiKey={googleMapsApiKey}
            value={value.street}
            onValueChange={(street) => patch({ street })}
            onPlaceSelected={(parsed) =>
              patch({
                street: parsed.street || value.street,
                number: parsed.number || value.number,
                city: parsed.city || value.city,
                state: parsed.state || value.state,
                postalCode: parsed.postalCode || value.postalCode,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ship-number">
            Número <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ship-number"
            value={value.number}
            onChange={(e) => patch({ number: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ship-floor">Piso / Depto</Label>
          <Input
            id="ship-floor"
            value={value.floor}
            onChange={(e) => patch({ floor: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ship-postal">
            Código postal <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ship-postal"
            value={value.postalCode}
            onChange={(e) => patch({ postalCode: e.target.value })}
            required
          />
          {postalValidation.loading ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Validando código postal…
            </p>
          ) : postalValidation.message ? (
            <p
              className={cn(
                "text-xs",
                postalValidation.valid
                  ? "text-emerald-700"
                  : "text-destructive",
              )}
            >
              {postalValidation.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ship-city">
            Localidad <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ship-city"
            value={value.city}
            onChange={(e) => patch({ city: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ship-state">
            Provincia <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ship-state"
            value={value.state}
            onChange={(e) => patch({ state: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ship-instructions">Instrucciones de entrega</Label>
        <Textarea
          id="ship-instructions"
          value={value.instructions}
          onChange={(e) => patch({ instructions: e.target.value })}
          rows={2}
        />
      </div>

      {showSaveOptions ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="ship-save"
              checked={value.saveToProfile}
              onCheckedChange={(checked) =>
                patch({ saveToProfile: checked === true })
              }
            />
            <Label htmlFor="ship-save" className="cursor-pointer text-sm leading-snug">
              Guardar esta dirección en mi cuenta
            </Label>
          </div>
          {value.saveToProfile ? (
            <div className="flex items-start gap-3">
              <Checkbox
                id="ship-default"
                checked={value.setAsDefault}
                onCheckedChange={(checked) =>
                  patch({ setAsDefault: checked === true })
                }
              />
              <Label
                htmlFor="ship-default"
                className="cursor-pointer text-sm leading-snug"
              >
                Marcar como dirección predeterminada
              </Label>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function isCheckoutAddressComplete(address: CheckoutAddressDraft): boolean {
  return Boolean(
    address.street.trim() &&
      address.number.trim() &&
      address.city.trim() &&
      address.state.trim() &&
      address.postalCode.trim(),
  );
}
