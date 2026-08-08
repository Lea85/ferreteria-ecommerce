"use client";

import { useSession } from "next-auth/react";

import { useOptionalAdminRole } from "@/components/admin/admin-role-context";
import { canAccessAdminPanel, isFullAdmin } from "@/lib/admin-permissions";

export function useIsAdmin(): boolean {
  const adminRole = useOptionalAdminRole();
  if (adminRole) return adminRole.isStaff;

  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return canAccessAdminPanel(role);
}

export function useIsFullAdmin(): boolean {
  const adminRole = useOptionalAdminRole();
  if (adminRole) return adminRole.isFullAdmin;

  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return isFullAdmin(role);
}
