/** Datos de contacto de la tienda para encabezado/pie del presupuesto (Integraciones). */
export function resolveQuoteStoreBranding(settings: Record<string, string>) {
  return {
    storeName: settings.store_name || "Ferretería",
    storeAddress:
      settings.google_maps_address || settings.store_address || "",
    storePhone: settings.whatsapp_number || "",
    /** Email de contacto — Integraciones → Email de contacto (`contact_email`). */
    storeEmail: settings.contact_email?.trim() || "",
    validityDays: settings.quote_validity_days || "7",
  };
}
