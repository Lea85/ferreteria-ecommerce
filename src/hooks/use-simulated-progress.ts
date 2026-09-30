"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Barra de progreso estimada mientras corre una operación larga sin % real del servidor.
 * Avanza hacia ~92% y llega a 100 solo con `complete()`.
 */
export function useSimulatedProgress(active: boolean, durationMs = 25000) {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) {
      doneRef.current = false;
      setProgress(0);
      return;
    }

    doneRef.current = false;
    setProgress(8);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      if (doneRef.current) return;
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(1, elapsed / Math.max(1, durationMs));
      // Ease-out: rápido al inicio, más lento cerca del techo.
      const eased = 1 - Math.pow(1 - ratio, 1.6);
      setProgress(8 + eased * 84);
    }, 150);

    return () => window.clearInterval(id);
  }, [active, durationMs]);

  const complete = useCallback(() => {
    doneRef.current = true;
    setProgress(100);
  }, []);

  return { progress, complete };
}
