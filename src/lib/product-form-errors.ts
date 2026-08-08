import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export type ProductFieldErrors = Record<string, string>;

export type ProductSaveErrorPayload = {
  error: string;
  errors: string[];
  fieldErrors: ProductFieldErrors;
};

export type ProductSubmitResult =
  | { ok: true }
  | ({ ok: false } & ProductSaveErrorPayload);

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  slug: "Slug",
  categoryIds: "Categorías",
  description: "Descripción",
  sku: "SKU",
  ean: "EAN",
  price: "Precio de publicación",
  costPrice: "Precio de compra",
  comparePrice: "Precio tachado",
  stock: "Stock",
  lowStockThreshold: "Stock mínimo",
  weight: "Peso",
  variants: "Variantes",
};

function labelForFieldPath(path: string): string {
  const parts = path.split(".");
  const last = parts[parts.length - 1] ?? path;
  const base = FIELD_LABELS[last] ?? last;

  const variantMatch = path.match(/^variants\.(\d+)\.(.+)$/);
  if (variantMatch) {
    const index = Number(variantMatch[1]) + 1;
    const field = FIELD_LABELS[variantMatch[2]] ?? variantMatch[2];
    return `Variante ${index} — ${field}`;
  }

  return FIELD_LABELS[path] ?? base;
}

/** Recorre errores de react-hook-form / zod y devuelve mensajes + paths. */
export function collectProductFormErrors(
  errors: FieldErrors<Record<string, unknown>>,
): { messages: string[]; fieldErrors: ProductFieldErrors } {
  const messages: string[] = [];
  const fieldErrors: ProductFieldErrors = {};

  function walk(node: unknown, path: string) {
    if (!node || typeof node !== "object") return;

    if (
      "message" in node &&
      typeof (node as { message?: unknown }).message === "string"
    ) {
      const message = (node as { message: string }).message;
      const label = path ? labelForFieldPath(path) : "Formulario";
      messages.push(`${label}: ${message}`);
      if (path) fieldErrors[path] = message;
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        const childPath = path ? `${path}.${index}` : String(index);
        walk(item, childPath);
      });
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      const childPath = path ? `${path}.${key}` : key;
      walk(value, childPath);
    }
  }

  walk(errors, "");
  return { messages, fieldErrors };
}

export function showProductFormErrorsToast(
  title: string,
  errors: string[],
) {
  if (errors.length === 0) {
    toast.error(title);
    return;
  }

  toast.error(title, {
    description: errors.join("\n"),
    duration: 12_000,
  });
}

export function applyProductFieldErrors(
  form: UseFormReturn<Record<string, unknown>>,
  fieldErrors: ProductFieldErrors,
) {
  for (const [path, message] of Object.entries(fieldErrors)) {
    form.setError(path, { type: "server", message });
  }

  const firstPath = Object.keys(fieldErrors)[0];
  if (firstPath) {
    void form.setFocus(firstPath);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[name="${firstPath}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
}

export function inputErrorClass(hasError: boolean, className?: string) {
  return cn(
    className,
    hasError &&
      "border-destructive bg-destructive/10 focus-visible:ring-destructive/30",
  );
}

export function sectionErrorClass(hasError: boolean, className?: string) {
  return cn(
    className,
    hasError && "border-destructive bg-destructive/10",
  );
}

export function getProductFieldError(
  errors: FieldErrors<Record<string, unknown>>,
  path: string,
): string | undefined {
  const parts = path.split(".");
  let node: unknown = errors;
  for (const part of parts) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  if (node && typeof node === "object" && "message" in node) {
    const message = (node as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

export function buildProductSaveErrorPayload(
  errors: string[],
  fieldErrors: ProductFieldErrors = {},
): ProductSaveErrorPayload {
  return {
    error: errors[0] ?? "No se pudo guardar el producto",
    errors,
    fieldErrors,
  };
}

export function parseProductSaveApiResponse(
  data: unknown,
  fallbackError: string,
): ProductSubmitResult {
  if (!data || typeof data !== "object") {
    return {
      ok: false,
      error: fallbackError,
      errors: [fallbackError],
      fieldErrors: {},
    };
  }

  const payload = data as Partial<ProductSaveErrorPayload>;
  const errors =
    Array.isArray(payload.errors) && payload.errors.length > 0
      ? payload.errors.map(String)
      : payload.error
        ? [String(payload.error)]
        : [fallbackError];

  return {
    ok: false,
    error: String(payload.error ?? errors[0] ?? fallbackError),
    errors,
    fieldErrors:
      payload.fieldErrors && typeof payload.fieldErrors === "object"
        ? (payload.fieldErrors as ProductFieldErrors)
        : {},
  };
}
