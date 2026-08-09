"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

import { useCartStore } from "@/stores/cart.store";

/**
 * Asocia el carrito al usuario activo y lo persiste en el servidor:
 * - Invitado que inicia sesión: su carrito se fusiona con el de su cuenta.
 * - Cambio de usuario: se carga el carrito de la nueva cuenta (aislado).
 * - Cierre de sesión: se limpia el carrito local (el del servidor queda intacto).
 * - Reingreso del mismo usuario: se recupera su carrito desde el servidor
 *   (sigue al usuario entre dispositivos).
 *
 * Se usa un identificador estable (id, con respaldo en email) para distinguir
 * usuarios de forma confiable en el cliente.
 */
export function CartUserSync() {
  const { status, data } = useSession();
  const handledKey = useRef<string | null>(null);

  const identity =
    status === "authenticated"
      ? data?.user?.id ?? data?.user?.email ?? null
      : null;

  useEffect(() => {
    if (status === "loading") return;

    const key = `${status}:${identity ?? "guest"}`;
    if (handledKey.current === key) return;
    handledKey.current = key;

    const store = useCartStore.getState();
    const prevUserId = store.userId;

    if (!identity) {
      // Sin sesión: limpiar si veníamos de un usuario logueado.
      if (prevUserId) store.logout();
      return;
    }

    if (prevUserId === identity) {
      void store.refreshFromServer();
    } else if (prevUserId === null) {
      // Invitado -> inicia sesión: adopta el carrito de invitado.
      void store.loginAs(identity, true);
    } else {
      // Cambio de usuario: carga el carrito de la nueva cuenta (sin fusionar).
      void store.loginAs(identity, false);
    }
  }, [status, identity]);

  return null;
}
