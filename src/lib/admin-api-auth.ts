import { NextResponse } from "next/server";

import type { AdminModule } from "@/lib/admin-permissions";
import {
  canAccessAdminModule,
  canAccessAdminPanel,
  isFullAdmin,
} from "@/lib/admin-permissions";

export function getSessionRole(session: {
  user?: { role?: string };
} | null): string | undefined {
  return session?.user?.role;
}

export function apiUnauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}

/** Cualquier rol con acceso al panel (ADMIN, SUPER_ADMIN, MOSTRADOR). */
export function requireAdminPanel(session: {
  user?: { role?: string };
} | null) {
  if (!session?.user || !canAccessAdminPanel(getSessionRole(session))) {
    return apiUnauthorized();
  }
  return null;
}

/** Solo ADMIN y SUPER_ADMIN. */
export function requireFullAdmin(session: {
  user?: { role?: string };
} | null) {
  if (!session?.user || !isFullAdmin(getSessionRole(session))) {
    return apiUnauthorized();
  }
  return null;
}

export function requireAdminModule(
  session: { user?: { role?: string } } | null,
  module: AdminModule,
) {
  if (!session?.user || !canAccessAdminModule(getSessionRole(session), module)) {
    return apiUnauthorized();
  }
  return null;
}
