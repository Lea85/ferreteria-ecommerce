"use client";

import { useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import {
  parseGooglePlace,
  useGoogleMapsPlaces,
  type ParsedGoogleAddress,
} from "@/hooks/use-google-maps-places";

type GooglePlacesAddressInputProps = {
  apiKey?: string;
  value: string;
  onValueChange: (value: string) => void;
  onPlaceSelected: (parsed: ParsedGoogleAddress) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

export function GooglePlacesAddressInput({
  apiKey,
  value,
  onValueChange,
  onPlaceSelected,
  placeholder = "Buscá tu calle con Google Maps…",
  disabled,
  id,
}: GooglePlacesAddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { ready } = useGoogleMapsPlaces(apiKey);

  useEffect(() => {
    if (!ready || !apiKey || !inputRef.current || !window.google?.maps?.places) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        componentRestrictions: { country: "ar" },
        fields: ["address_components", "formatted_address"],
        types: ["address"],
      },
    );

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place?.address_components?.length) return;
      const parsed = parseGooglePlace(place);
      onPlaceSelected(parsed);
      onValueChange(
        [parsed.street, parsed.number].filter(Boolean).join(" ").trim(),
      );
    });

    return () => {
      listener.remove();
    };
  }, [ready, apiKey, onPlaceSelected, onValueChange]);

  return (
    <div className="space-y-1">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={apiKey && ready ? placeholder : "Calle"}
        disabled={disabled}
        autoComplete="off"
      />
      {apiKey && ready ? (
        <p className="text-xs text-muted-foreground">
          Autocompletado con Google Maps (Argentina).
        </p>
      ) : null}
    </div>
  );
}
