"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

import { useCartStore } from "@/stores/cart.store";

/**
 * Asocia el carrito al usuario activo y lo persiste en el servidor:
 * - Invitado que inicia sesión: su carrito se fusiona con el de su cuenta.
 * - Cambio de usuario: se carga el carrito de la nueva cuenta.
 * - Cierre de sesión: se limpia el carrito local (el del servidor queda intacto).
 * - Reingreso del mismo usuario: se recupera su carrito desde el servidor
 *   (sigue al usuario entre dispositivos).
 */
export function CartUserSync() {
  const { status, data } = useSession();
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    const sessionUserId =
      status === "authenticated" ? data?.user?.id ?? null : null;
    const key = `${status}:${sessionUserId ?? "guest"}`;
    if (handledKey.current === key) return;
    handledKey.current = key;

    const store = useCartStore.getState();
    const prevUserId = store.userId;

    if (!sessionUserId) {
      // Sin sesión: solo limpiar si veníamos de un usuario logueado.
      if (prevUserId) store.logout();
      return;
    }

    if (prevUserId === sessionUserId) {
      void store.refreshFromServer();
    } else if (prevUserId === null) {
      void store.loginAs(sessionUserId, true);
    } else {
      void store.loginAs(sessionUserId, false);
    }
  }, [status, data?.user?.id]);

  return null;
}
