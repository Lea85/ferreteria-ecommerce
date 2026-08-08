"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    google?: typeof google;
  }
}

let loaderPromise: Promise<typeof google | null> | null = null;

function loadGoogleMaps(apiKey: string): Promise<typeof google | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google ?? null));
      existing.addEventListener("error", () => resolve(null));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=es&region=AR`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "1";
    script.onload = () => resolve(window.google ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export function useGoogleMapsPlaces(apiKey?: string) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey?.trim()) {
      setReady(false);
      setError(null);
      return;
    }

    let cancelled = false;
    void loadGoogleMaps(apiKey.trim()).then((google) => {
      if (cancelled) return;
      if (google?.maps?.places) {
        setReady(true);
        setError(null);
      } else {
        setReady(false);
        setError("No se pudo cargar Google Maps.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return { ready, error };
}

export type ParsedGoogleAddress = {
  street: string;
  number: string;
  city: string;
  state: string;
  postalCode: string;
};

export function parseGooglePlace(place: google.maps.places.PlaceResult): ParsedGoogleAddress {
  const components = place.address_components ?? [];
  const find = (...types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)));

  const route = find("route")?.long_name ?? "";
  const streetNumber = find("street_number")?.long_name ?? "";
  const locality =
    find("locality")?.long_name ??
    find("sublocality", "sublocality_level_1")?.long_name ??
    "";
  const adminArea =
    find("administrative_area_level_1")?.short_name ??
    find("administrative_area_level_1")?.long_name ??
    "";
  const postalCode = find("postal_code")?.long_name ?? "";

  return {
    street: route,
    number: streetNumber,
    city: locality,
    state: adminArea,
    postalCode,
  };
}
