export type AdminProductsListState = {
  search?: string;
  page?: number;
  active?: string;
  /** IDs de categoría (OR entre sí). */
  categories?: string[];
  /** @deprecated Prefer `categories`. Single category id. */
  category?: string;
  /** IDs de marca (OR entre sí). */
  brands?: string[];
  /** IDs de proveedor (OR entre sí). */
  suppliers?: string[];
};

const LIST_PATH = "/admin/productos";

function appendIdList(
  params: URLSearchParams,
  key: string,
  ids: string[] | undefined,
) {
  const unique = [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))];
  if (unique.length > 0) {
    params.set(key, unique.join(","));
  }
}

function resolveCategoryIds(state: AdminProductsListState): string[] {
  const fromPlural = [...new Set((state.categories ?? []).map((id) => id.trim()).filter(Boolean))];
  if (fromPlural.length > 0) return fromPlural;
  const one = state.category?.trim();
  return one ? [one] : [];
}

export function buildAdminProductsListPath(
  state: AdminProductsListState,
): string {
  const params = new URLSearchParams();
  const search = state.search?.trim();
  if (search) params.set("search", search);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  if (state.active && state.active !== "all") params.set("active", state.active);
  appendIdList(params, "categories", resolveCategoryIds(state));
  appendIdList(params, "brands", state.brands);
  appendIdList(params, "suppliers", state.suppliers);
  const qs = params.toString();
  return qs ? `${LIST_PATH}?${qs}` : LIST_PATH;
}

function parseIdList(
  searchParams: URLSearchParams,
  pluralKey: string,
  legacyKey: string,
): string[] {
  const plural = searchParams.get(pluralKey);
  if (plural) {
    return [...new Set(plural.split(",").map((s) => s.trim()).filter(Boolean))];
  }
  const legacy = searchParams.get(legacyKey)?.trim();
  if (legacy && legacy !== "all") return [legacy];
  return [];
}

export function parseAdminProductsListSearchParams(
  searchParams: URLSearchParams,
): AdminProductsListState {
  const pageRaw = parseInt(searchParams.get("page") || "1", 10);
  return {
    search: searchParams.get("search")?.trim() || "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    active: searchParams.get("active") || "all",
    categories: parseIdList(searchParams, "categories", "category"),
    brands: parseIdList(searchParams, "brands", "brand"),
    suppliers: parseIdList(searchParams, "suppliers", "supplier"),
  };
}

/** Solo rutas internas del listado de productos. */
export function sanitizeAdminProductsReturnTo(value: string | null): string | null {
  if (!value?.startsWith(LIST_PATH)) return null;
  if (value.includes("://") || value.startsWith("//")) return null;
  return value;
}

export function appendAdminProductsNavParams(
  href: string,
  options: { returnTo: string; back?: string },
): string {
  const params = new URLSearchParams();
  params.set("returnTo", options.returnTo);
  if (options.back) params.set("back", options.back);
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${params.toString()}`;
}

export function resolveAdminProductsBackHref(
  searchParams: URLSearchParams,
  fallback = LIST_PATH,
): string {
  const back = sanitizeAdminProductsReturnTo(searchParams.get("back"));
  if (back) return back;
  const returnTo = sanitizeAdminProductsReturnTo(searchParams.get("returnTo"));
  if (returnTo) return returnTo;
  return fallback;
}

export function countAdminProductsListFilters(state: AdminProductsListState): number {
  let count = 0;
  if (state.active && state.active !== "all") count += 1;
  count += resolveCategoryIds(state).length;
  count += state.brands?.length ?? 0;
  count += state.suppliers?.length ?? 0;
  return count;
}
