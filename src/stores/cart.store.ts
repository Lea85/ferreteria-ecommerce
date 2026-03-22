"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  /** Precio unitario mostrado (puede diferir del precio final según tipo de cliente) */
  price: number;
  quantity: number;
  variantLabel?: string;
  sku?: string;
};

type CartState = {
  items: CartItem[];
  /** Panel lateral del carrito (no se persiste) */
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  /** Cantidad total de unidades */
  getTotalCount: () => number;
  /** Alias útil para la UI */
  getItemCount: () => number;
  /** Subtotal estimado (precio × cantidad) */
  getSubtotal: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      addItem: (item) => {
        const qty = item.quantity ?? 1;
        set((state) => {
          const idx = state.items.findIndex(
            (i) => i.variantId === item.variantId,
          );
          if (idx >= 0) {
            const next = [...state.items];
            next[idx] = {
              ...next[idx],
              quantity: next[idx].quantity + qty,
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
                quantity: qty,
                variantLabel: item.variantLabel,
                sku: item.sku,
              },
            ],
          };
        });
      },
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId ? { ...i, quantity } : i,
                ),
        })),
      clearCart: () => set({ items: [] }),
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
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
