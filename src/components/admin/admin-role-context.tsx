"use client";

import { createContext, useContext } from "react";

import {
  canAccessAdminPanel,
  isFullAdmin,
} from "@/lib/admin-permissions";

type AdminRoleContextValue = {
  role: string;
  isFullAdmin: boolean;
  isStaff: boolean;
};

const AdminRoleContext = createContext<AdminRoleContextValue | null>(null);

export function AdminRoleProvider({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const value: AdminRoleContextValue = {
    role,
    isFullAdmin: isFullAdmin(role),
    isStaff: canAccessAdminPanel(role),
  };

  return (
    <AdminRoleContext.Provider value={value}>{children}</AdminRoleContext.Provider>
  );
}

export function useOptionalAdminRole(): AdminRoleContextValue | null {
  return useContext(AdminRoleContext);
}
