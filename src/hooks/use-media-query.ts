import { useSyncExternalStore } from "react";

/** Si la pantalla cumple la media query (p. ej. "(min-width: 768px)"); cambia al girar el móvil o redimensionar. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
