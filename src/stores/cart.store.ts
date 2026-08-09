"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  resolveCartQuantity,
  toastOverStockWarning,
} from "@/lib/cart-stock";

export type CartItem = {
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  /** Stock disponible al agregar (se actualiza al hidratar carrito). */
  stock: number;
  variantLabel?: string;
  sku?: string;
};

/** Obtiene el carrito del usuario autenticado desde el servidor. */
async function fetchServerCart(): Promise<CartItem[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/user/cart", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? (data.items as CartItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda el carrito en el servidor. mode="replace" sincroniza el set completo;
 * mode="merge" suma cantidades a lo ya guardado. Devuelve el carrito resultante
 * o null si falló.
 */
async function pushCart(
  items: CartItem[],
  mode: "replace" | "merge",
): Promise<CartItem[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/user/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.items) ? (data.items as CartItem[]) : null;
  } catch {
    return null;
  }
}

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  /** Usuario dueño del carrito (null = invitado). */
  userId: string | null;
  /** Evita que la hidratación desde el servidor dispare un guardado. */
  _suppressSave: boolean;
  /** Admin: permite cantidades mayores al stock (checkout web sigue bloqueado). */
  adminStockBypass: boolean;
  setAdminStockBypass: (enabled: boolean) => void;
  /**
   * Inicia sesión: adopta el carrito de invitado (si mergeGuestCart) fusionándolo
   * con el del servidor, y luego hidrata desde el servidor. El carrito queda
   * persistido por usuario en la base de datos (sigue al usuario entre dispositivos).
   */
  loginAs: (userId: string, mergeGuestCart: boolean) => Promise<void>;
  /** Cierra sesión: limpia el carrito local (el del servidor queda intacto). */
  logout: () => void;
  /** Recarga el carrito del usuario desde el servidor. */
  refreshFromServer: () => Promise<void>;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  syncStocks: (stocks: Record<string, number>) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalCount: () => number;
  getItemCount: () => number;
  getSubtotal: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      userId: null,
      // Arranca en true para no guardar durante la hidratación inicial /
      // rehidratación de localStorage; se libera tras el primer sync con el server.
      _suppressSave: true,
      adminStockBypass: false,
      setAdminStockBypass: (enabled) => set({ adminStockBypass: enabled }),
      loginAs: async (userId, mergeGuestCart) => {
        const guestItems = get().items;
        // Al cambiar de usuario (sin fusión) se vacía de inmediato para no
        // mostrar los ítems del usuario anterior mientras carga el servidor.
        set({
          userId,
          _suppressSave: true,
          items: mergeGuestCart ? guestItems : [],
        });
        try {
          if (mergeGuestCart && guestItems.length > 0) {
            const merged = await pushCart(guestItems, "merge");
            if (merged) {
              set({ items: merged });
              return;
            }
          }
          const serverItems = await fetchServerCart();
          set({ items: serverItems });
        } finally {
          set({ _suppressSave: false });
        }
      },
      logout: () => {
        set({ items: [], isOpen: false, userId: null });
      },
      refreshFromServer: async () => {
        if (!get().userId) return;
        set({ _suppressSave: true });
        try {
          const serverItems = await fetchServerCart();
          set({ items: serverItems });
        } finally {
          set({ _suppressSave: false });
        }
      },
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      addItem: (item) => {
        const bypass = get().adminStockBypass;
        const stock = Math.max(0, item.stock ?? 0);
        const addQty = resolveCartQuantity(item.quantity ?? 1, stock, bypass);

        set((state) => {
          const idx = state.items.findIndex(
            (i) => i.variantId === item.variantId,
          );
          if (idx >= 0) {
            const next = [...state.items];
            const merged = next[idx].quantity + addQty;
            const quantity = resolveCartQuantity(merged, stock, bypass);
            next[idx] = {
              ...next[idx],
              stock,
              quantity,
            };
            return { items: next };
          }
          return {
            items: [
              ...state.items,
              {
                variantId: item.variantId,
                productId: item.productId,
                name: item.name,
                slug: item.slug,
                image: item.image,
                price: item.price,
                quantity: addQty,
                stock,
                variantLabel: item.variantLabel,
                sku: item.sku,
              },
            ],
          };
        });

        const line = get().items.find((i) => i.variantId === item.variantId);
        if (bypass && line && line.quantity > line.stock) {
          toastOverStockWarning(line.name, line.quantity, line.stock);
        }
      },
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      updateQuantity: (variantId, quantity) => {
        const bypass = get().adminStockBypass;
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((i) => i.variantId !== variantId),
            };
          }
          return {
            items: state.items.map((i) => {
              if (i.variantId !== variantId) return i;
              return {
                ...i,
                quantity: resolveCartQuantity(quantity, i.stock, bypass),
              };
            }),
          };
        });

        const line = get().items.find((i) => i.variantId === variantId);
        if (bypass && line && line.quantity > line.stock) {
          toastOverStockWarning(line.name, line.quantity, line.stock);
        }
      },
      syncStocks: (stocks) =>
        set((state) => ({
          items: state.items.map((i) => {
            const stock = stocks[i.variantId];
            if (stock === undefined) return i;
            return {
              ...i,
              stock,
              quantity: resolveCartQuantity(
                i.quantity,
                stock,
                state.adminStockBypass,
              ),
            };
          }),
        })),
      clearCart: () => {
        const userId = get().userId ?? null;
        set({ items: [], isOpen: false });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              "ferreteria-cart",
              JSON.stringify({ state: { items: [], userId }, version: 0 }),
            );
          } catch {
            /* ignore quota / private mode */
          }
        }
      },
      getTotalCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "ferreteria-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, userId: state.userId }),
    },
  ),
);

// Autoguardado: cuando un usuario autenticado modifica el carrito, se sincroniza
// con el servidor (con debounce). Se omite durante la hidratación server-side.
if (typeof window !== "undefined") {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  useCartStore.subscribe((state, prev) => {
    if (!state.userId) return;
    if (state._suppressSave) return;
    if (state.items === prev.items) return; // solo cambios de items
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const current = useCartStore.getState();
      if (!current.userId || current._suppressSave) return;
      void pushCart(current.items, "replace");
    }, 600);
  });
}
