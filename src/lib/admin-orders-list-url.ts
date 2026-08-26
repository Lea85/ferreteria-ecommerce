export type AdminOrdersListState = {
  search?: string;
  page?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  /** SKU o EAN del producto vendido. */
  sku?: string;
};

const LIST_PATH = "/admin/pedidos";

export function buildAdminOrdersListPath(state: AdminOrdersListState): string {
  const params = new URLSearchParams();
  const search = state.search?.trim();
  if (search) params.set("search", search);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  if (state.status && state.status !== "all") params.set("status", state.status);
  if (state.dateFrom?.trim()) params.set("dateFrom", state.dateFrom.trim());
  if (state.dateTo?.trim()) params.set("dateTo", state.dateTo.trim());
  const sku = state.sku?.trim();
  if (sku) params.set("sku", sku);
  const qs = params.toString();
  return qs ? `${LIST_PATH}?${qs}` : LIST_PATH;
}

export function parseAdminOrdersListSearchParams(
  searchParams: URLSearchParams,
): AdminOrdersListState {
  const pageRaw = parseInt(searchParams.get("page") || "1", 10);
  return {
    search: searchParams.get("search")?.trim() || "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    status: searchParams.get("status") || "all",
    dateFrom: searchParams.get("dateFrom")?.trim() || "",
    dateTo: searchParams.get("dateTo")?.trim() || "",
    sku: searchParams.get("sku")?.trim() || "",
  };
}

/** Solo rutas internas del listado de ventas. */
export function sanitizeAdminOrdersReturnTo(value: string | null): string | null {
  if (!value?.startsWith(LIST_PATH)) return null;
  if (value.includes("://") || value.startsWith("//")) return null;
  return value;
}

export function appendAdminOrdersNavParams(
  href: string,
  options: { returnTo: string },
): string {
  const params = new URLSearchParams();
  params.set("returnTo", options.returnTo);
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${params.toString()}`;
}

export function resolveAdminOrdersBackHref(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
  fallback = LIST_PATH,
): string {
  const returnTo = sanitizeAdminOrdersReturnTo(searchParams.get("returnTo"));
  if (returnTo) return returnTo;
  return fallback;
}
