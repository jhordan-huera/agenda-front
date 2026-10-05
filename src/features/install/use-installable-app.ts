import { useEffect } from "react";

let registered = false;

/**
 * Enlaza el manifiesto y registra el service worker (src/sw.ts). Lo usan el panel, el login, el
 * onboarding y el panel de plataforma; la portada y la página de reservas no, para que a un
 * cliente no se le ofrezca instalar el panel ni descargue la app entera.
 */
export function useInstallableApp(): void {
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/manifest.webmanifest";
      document.head.append(link);
    }
    // En desarrollo no: el service worker serviría versiones viejas mientras se programa.
    if (registered || !import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    registered = true;
    const register = () => void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
}
