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

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  /** Admin: permite cantidades mayores al stock (checkout web sigue bloqueado). */
  adminStockBypass: boolean;
  setAdminStockBypass: (enabled: boolean) => void;
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
      adminStockBypass: false,
      setAdminStockBypass: (enabled) => set({ adminStockBypass: enabled }),
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
        set({ items: [], isOpen: false });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              "ferreteria-cart",
              JSON.stringify({ state: { items: [] }, version: 0 }),
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
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
