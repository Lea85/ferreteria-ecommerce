"use client";

import { useEffect } from "react";

import { useCartStore } from "@/stores/cart.store";

/** Actualiza stock en carrito desde la API (ítems viejos sin stock guardado). */
export function useCartStockSync() {
  const items = useCartStore((s) => s.items);
  const syncStocks = useCartStore((s) => s.syncStocks);

  useEffect(() => {
    if (items.length === 0) return;
    const ids = items.map((i) => i.variantId).join(",");
    fetch(`/api/products/variants-stock?ids=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.stocks) syncStocks(d.stocks);
      })
      .catch(() => {});
  }, [items.map((i) => i.variantId).join(","), syncStocks]);
}
