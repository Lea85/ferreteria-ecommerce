"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { clampToStock } from "@/lib/cart-quantity";

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

type CartState = {
  items: CartItem[];
  isOpen: boolean;
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
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      addItem: (item) => {
        const stock = Math.max(0, item.stock ?? 0);
        const addQty = clampToStock(item.quantity ?? 1, stock);

        set((state) => {
          const idx = state.items.findIndex(
            (i) => i.variantId === item.variantId,
          );
          if (idx >= 0) {
            const next = [...state.items];
            const merged = next[idx].quantity + addQty;
            next[idx] = {
              ...next[idx],
              stock,
              quantity: clampToStock(merged, stock),
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
      },
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      updateQuantity: (variantId, quantity) =>
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
                quantity: clampToStock(quantity, i.stock),
              };
            }),
          };
        }),
      syncStocks: (stocks) =>
        set((state) => ({
          items: state.items.map((i) => {
            const stock = stocks[i.variantId];
            if (stock === undefined) return i;
            return {
              ...i,
              stock,
              quantity: clampToStock(i.quantity, stock),
            };
          }),
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
