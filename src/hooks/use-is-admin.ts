"use client";

import { useSession } from "next-auth/react";

export function useIsAdmin(): boolean {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MOSTRADOR";
}

export function useIsFullAdmin(): boolean {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
