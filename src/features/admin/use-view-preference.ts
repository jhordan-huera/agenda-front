import { useCallback, useState } from "react";

/** Cómo se ve una lista del panel de plataforma (spec 007). */
export type AdminView = "tarjetas" | "lista";
export type AdminViewScreen = "negocios" | "usuarios";

const keyOf = (screen: AdminViewScreen) => `agenda360.admin.vista.${screen}`;

function readView(screen: AdminViewScreen): AdminView {
  try {
    return window.localStorage.getItem(keyOf(screen)) === "lista" ? "lista" : "tarjetas";
  } catch {
    return "tarjetas";
  }
}

/**
 * Tarjetas o lista, recordado en este navegador (no en la cuenta). Si el navegador no deja guardarlo
 * (navegación privada, almacenamiento bloqueado), se ven tarjetas.
 */
export function useViewPreference(screen: AdminViewScreen) {
  const [view, setView] = useState<AdminView>(() => readView(screen));
  const change = useCallback(
    (next: AdminView) => {
      setView(next);
      try {
        window.localStorage.setItem(keyOf(screen), next);
      } catch {
        // Sin almacenamiento: vale para esta visita.
      }
    },
    [screen],
  );
  return [view, change] as const;
}
