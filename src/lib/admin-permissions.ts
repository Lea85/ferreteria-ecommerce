import type { UserRole } from "@/lib/constants";

export type AdminModule =
  | "dashboard"
  | "productos"
  | "ventas"
  | "presupuestos"
  | "clientes"
  | "almacen"
  | "cupones"
  | "promociones"
  | "campanas"
  | "alquileres"
  | "proveedores"
  | "proveedores_pedidos"
  | "newsletter"
  | "categorias"
  | "marcas"
  | "reportes"
  | "integraciones"
  | "legales"
  | "productos_edit"
  | "productos_bulk"
  | "productos_atributos"
  | "productos_cost";

const MOSTRADOR_MODULES: AdminModule[] = [
  "dashboard",
  "productos",
  "ventas",
  "presupuestos",
  "clientes",
  "almacen",
  "cupones",
  "promociones",
  "campanas",
  "alquileres",
  "proveedores",
  "proveedores_pedidos",
  "newsletter",
];

const FULL_ADMIN_ONLY: AdminModule[] = [
  "categorias",
  "marcas",
  "reportes",
  "integraciones",
  "legales",
  "productos_edit",
  "productos_bulk",
  "productos_atributos",
  "productos_cost",
];

export function canAccessAdminPanel(role: string | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MOSTRADOR";
}

export function isFullAdmin(role: string | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Compat: acceso al panel / APIs operativas de mostrador. */
export function isStaffRole(role: string | undefined): boolean {
  return canAccessAdminPanel(role);
}

export function canAccessAdminModule(
  role: string | undefined,
  module: AdminModule,
): boolean {
  if (!canAccessAdminPanel(role)) return false;
  if (isFullAdmin(role)) return true;
  if (FULL_ADMIN_ONLY.includes(module)) return false;
  return MOSTRADOR_MODULES.includes(module);
}

export function canViewProductCostPrice(role: string | undefined): boolean {
  return canAccessAdminModule(role, "productos_cost");
}

export function canEditProducts(role: string | undefined): boolean {
  return canAccessAdminModule(role, "productos_edit");
}

export function canUseStoreQuotes(role: string | undefined): boolean {
  return role === "MOSTRADOR" || isFullAdmin(role);
}

export function canUseCounterSale(role: string | undefined): boolean {
  return canAccessAdminPanel(role);
}

const BLOCKED_PATH_PREFIXES_MOSTRADOR = [
  "/admin/categorias",
  "/admin/marcas",
  "/admin/reportes",
  "/admin/integraciones",
  "/admin/legales",
  "/admin/categorias-clientes",
  "/admin/productos/nuevo",
  "/admin/productos/atributos",
];

/** Rutas del panel permitidas para el rol MOSTRADOR. */
export function canAccessAdminPath(
  role: string | undefined,
  pathname: string,
): boolean {
  if (!canAccessAdminPanel(role)) return false;
  if (isFullAdmin(role)) return true;

  const path = pathname.split("?")[0];
  if (BLOCKED_PATH_PREFIXES_MOSTRADOR.some((p) => path.startsWith(p))) {
    return false;
  }

  // Edición de producto: /admin/productos/[id] pero no /detalle/
  if (
    /^\/admin\/productos\/[^/]+$/.test(path) &&
    !path.startsWith("/admin/productos/detalle/")
  ) {
    return false;
  }

  return true;
}

export const MOSTRADOR_ROLE: UserRole = "MOSTRADOR";
