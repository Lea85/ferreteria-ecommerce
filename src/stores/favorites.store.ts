"use client";

import { create } from "zustand";

type FavoritesState = {
  ids: string[];
  loaded: boolean;
  loading: boolean;
  hydrate: () => Promise<void>;
  reset: () => void;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => Promise<"added" | "removed" | "auth_required" | "error">;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  loaded: false,
  loading: false,

  reset: () => set({ ids: [], loaded: false, loading: false }),

  hydrate: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/user/favorites");
      const data = await res.json();
      set({
        ids: Array.isArray(data.favoriteIds) ? data.favoriteIds : [],
        loaded: true,
        loading: false,
      });
    } catch {
      set({ loaded: true, loading: false });
    }
  },

  isFavorite: (productId) => get().ids.includes(productId),

  toggle: async (productId) => {
    const wasFavorite = get().isFavorite(productId);
    const previousIds = get().ids;
    const nextIds = wasFavorite
      ? previousIds.filter((id) => id !== productId)
      : [...previousIds, productId];

    set({ ids: nextIds });

    try {
      const res = wasFavorite
        ? await fetch(
            `/api/user/favorites?productId=${encodeURIComponent(productId)}`,
            { method: "DELETE" },
          )
        : await fetch("/api/user/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });

      if (res.status === 401) {
        set({ ids: previousIds });
        return "auth_required";
      }

      if (!res.ok) {
        set({ ids: previousIds });
        return "error";
      }

      return wasFavorite ? "removed" : "added";
    } catch {
      set({ ids: previousIds });
      return "error";
    }
  },
}));
