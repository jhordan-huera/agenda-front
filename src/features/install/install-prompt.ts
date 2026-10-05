import { useSyncExternalStore } from "react";

/**
 * Instalar Agenda360 como aplicación. Chrome y Edge (Android y computador) avisan con
 * `beforeinstallprompt` cuando se puede instalar: el aviso se guarda para el botón propio
 * ("Instalar aplicación"). En iPhone y iPad no hay aviso: se instala desde Compartir →
 * "Agregar a inicio", y el botón muestra esos pasos.
 *
 * Este módulo se importa al arrancar (main.tsx): el aviso puede llegar antes de que el panel se monte.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  emit();
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  installed = true;
  emit();
});

/** Ya está abierta como aplicación instalada (no en una pestaña del navegador). */
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone o iPad (el iPad se presenta como Mac, pero con pantalla táctil). */
function isAppleMobile(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

/** "prompt": botón de instalar del navegador; "ios": pasos de Compartir; null: ya está o no se puede. */
export type InstallMode = "prompt" | "ios" | null;

export function useInstallApp() {
  const prompt = useSyncExternalStore(subscribe, () => deferredPrompt);
  const done = useSyncExternalStore(subscribe, () => installed);
  const mode: InstallMode = done || isStandalone() ? null : prompt ? "prompt" : isAppleMobile() ? "ios" : null;

  /** Abre el diálogo del navegador. Devuelve si la persona aceptó. */
  const install = async (): Promise<boolean> => {
    const event = deferredPrompt;
    if (!event) return false;
    // El aviso sirve una sola vez: si lo rechaza, el navegador manda otro más adelante.
    deferredPrompt = null;
    emit();
    await event.prompt();
    return (await event.userChoice).outcome === "accepted";
  };

  return { mode, install };
}
