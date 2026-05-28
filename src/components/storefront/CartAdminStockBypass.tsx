"use client";

import { useEffect } from "react";

import { useIsAdmin } from "@/hooks/use-is-admin";
import { useCartStore } from "@/stores/cart.store";

/** Activa en el carrito el bypass de tope de stock para administradores. */
export function CartAdminStockBypass() {
  const isAdmin = useIsAdmin();
  const setAdminStockBypass = useCartStore((s) => s.setAdminStockBypass);

  useEffect(() => {
    setAdminStockBypass(isAdmin);
  }, [isAdmin, setAdminStockBypass]);

  return null;
}
