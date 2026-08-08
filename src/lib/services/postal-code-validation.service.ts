import {
  detectPostalCodeFormat,
  normalizePostalCodeInput,
  provinceMatchesCpaLetter,
  type PostalCodeFormat,
} from "@/lib/argentina-postal-code";
import { getIntegracionesSettings } from "@/lib/integraciones-settings";

export type PostalCodeValidationResult = {
  valid: boolean;
  format: PostalCodeFormat;
  normalized: string;
  message: string;
  source: "format" | "georef" | "correo_argentino";
  locality?: string;
  province?: string;
};

async function validateWithGeoref(
  city: string,
  state: string,
): Promise<{ ok: boolean; locality?: string; province?: string }> {
  const params = new URLSearchParams({
    nombre: city.trim(),
    provincia: state.trim(),
    max: "1",
  });

  const res = await fetch(
    `https://apis.datos.gob.ar/georef/api/localidades?${params.toString()}`,
    { next: { revalidate: 86400 } },
  );

  if (!res.ok) return { ok: false };

  const data = (await res.json()) as {
    localidades?: { nombre: string; provincia?: { nombre?: string } }[];
  };

  const hit = data.localidades?.[0];
  if (!hit) return { ok: false };

  return {
    ok: true,
    locality: hit.nombre,
    province: hit.provincia?.nombre,
  };
}

async function validateWithCorreoArgentino(
  code: string,
  city: string,
  state: string,
  credentials: {
    apiKey: string;
    agreementId: string;
    baseUrl: string;
  },
): Promise<{ ok: boolean; message?: string }> {
  const base = credentials.baseUrl.replace(/\/$/, "");
  const url = `${base}/cpa/rest/GetCPAByProvLocalidadCP?codProvincia=${encodeURIComponent(state)}&localidad=${encodeURIComponent(city)}&codPostal=${encodeURIComponent(code)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: credentials.apiKey,
        agreement: credentials.agreementId,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, message: "Correo Argentino no pudo validar el código." };
    }

    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, message: "Respuesta inválida de Correo Argentino." };

    const ok = Boolean(
      data.cpa ||
        data.CPA ||
        data.codigoPostal ||
        data.valid === true ||
        data.resultado === "OK",
    );

    return {
      ok,
      message: ok
        ? undefined
        : "El código postal no coincide con la localidad indicada.",
    };
  } catch {
    return { ok: false, message: "No se pudo contactar a Correo Argentino." };
  }
}

export async function validatePostalCode(params: {
  code: string;
  city?: string;
  state?: string;
}): Promise<PostalCodeValidationResult> {
  const normalized = normalizePostalCodeInput(params.code);
  const format = detectPostalCodeFormat(normalized);

  if (format === "invalid") {
    return {
      valid: false,
      format,
      normalized,
      message:
        "Ingresá un código postal válido (4 dígitos, ej. 1043) o CPA (8 caracteres, ej. C1425ABC).",
      source: "format",
    };
  }

  if (format === "cpa" && params.state?.trim()) {
    const letter = normalized[0];
    if (!provinceMatchesCpaLetter(params.state, letter)) {
      return {
        valid: false,
        format,
        normalized,
        message: `El CPA empieza con "${letter}" pero no coincide con la provincia indicada.`,
        source: "format",
      };
    }
  }

  const city = params.city?.trim() ?? "";
  const state = params.state?.trim() ?? "";

  if (city && state) {
    const settings = await getIntegracionesSettings([
      "correo_argentino_api_key",
      "correo_argentino_agreement_id",
      "correo_argentino_api_base_url",
    ]);

    const apiKey = settings.correo_argentino_api_key?.trim();
    const agreementId = settings.correo_argentino_agreement_id?.trim();
    const baseUrl = settings.correo_argentino_api_base_url?.trim();

    if (apiKey && agreementId && baseUrl) {
      const correo = await validateWithCorreoArgentino(
        normalized,
        city,
        state,
        { apiKey, agreementId, baseUrl },
      );
      if (correo.ok) {
        return {
          valid: true,
          format,
          normalized,
          message: "Código postal validado con Correo Argentino.",
          source: "correo_argentino",
        };
      }
      if (correo.message && !correo.message.includes("contactar")) {
        return {
          valid: false,
          format,
          normalized,
          message: correo.message,
          source: "correo_argentino",
        };
      }
    }

    const georef = await validateWithGeoref(city, state);
    if (georef.ok) {
      return {
        valid: true,
        format,
        normalized,
        message: "Localidad verificada. Código postal con formato válido.",
        source: "georef",
        locality: georef.locality,
        province: georef.province,
      };
    }

    return {
      valid: false,
      format,
      normalized,
      message:
        "No encontramos esa localidad en la provincia indicada. Revisá ciudad y provincia.",
      source: "georef",
    };
  }

  return {
    valid: true,
    format,
    normalized,
    message:
      format === "cpa"
        ? "Formato CPA válido. Completá localidad y provincia para validación completa."
        : "Formato de código postal válido. Completá localidad y provincia para validación completa.",
    source: "format",
  };
}
