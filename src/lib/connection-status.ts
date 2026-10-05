import { useSyncExternalStore } from "react";

/**
 * Estado de la conexión para el aviso de OfflineBanner: sin internet (navigator.onLine) o con
 * internet pero sin respuesta de la API al arrancar (p. ej. una wifi sin salida a internet).
 */
let apiUnreachable = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};

export function setApiUnreachable(value: boolean): void {
  if (apiUnreachable === value) return;
  apiUnreachable = value;
  listeners.forEach((listener) => listener());
}

/** "offline": sin internet; "unreachable": la API no responde; null: todo bien. */
export function useConnectionProblem(): "offline" | "unreachable" | null {
  return useSyncExternalStore(subscribe, () => (!navigator.onLine ? "offline" : apiUnreachable ? "unreachable" : null));
}
