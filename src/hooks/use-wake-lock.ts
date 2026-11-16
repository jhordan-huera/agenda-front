import { useEffect } from "react";

/**
 * Mientras `active`, pide que la pantalla no se apague (p. ej. el QR del paciente, mientras lo escanean). Sin la API
 * del navegador, o si la niega (batería baja), no pasa nada. Al volver a la pestaña se pide otra vez: el navegador la
 * suelta al ocultarla.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let done = false;
    const request = () => {
      navigator.wakeLock.request("screen").then(
        (next) => {
          if (done) void next.release().catch(() => undefined);
          else sentinel = next;
        },
        () => undefined,
      );
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
