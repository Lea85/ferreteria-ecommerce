"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { useFavoritesStore } from "@/stores/favorites.store";

/** Carga los favoritos del usuario al iniciar sesión. */
export function FavoritesSync() {
  const { status } = useSession();
  const hydrate = useFavoritesStore((s) => s.hydrate);
  const reset = useFavoritesStore((s) => s.reset);

  useEffect(() => {
    if (status === "authenticated") {
      void hydrate();
    } else if (status === "unauthenticated") {
      reset();
    }
  }, [status, hydrate, reset]);

  return null;
}
