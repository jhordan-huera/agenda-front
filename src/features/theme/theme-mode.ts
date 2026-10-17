import { THEME_MODE_LABELS } from "@/lib/constants/app";
import type { ThemeMode } from "@/types";

/**
 * El modo de pantalla (spec 019): cómo decide la app si se ve clara u oscura. public/theme-boot.js
 * repite esta misma regla antes de que llegue la app (sin destello): si cambia aquí, cambia allí.
 */

/** Cómo se ve la pantalla ahora: el modo elegido con «Automático» ya resuelto. */
export type ResolvedTheme = "light" | "dark";

/**
 * La última elección en este aparato: sólo para arrancar sin destello y para las pantallas de antes
 * de iniciar sesión. Lo que manda es la cuenta.
 */
export const THEME_STORAGE_KEY = "agenda360:modo-pantalla";

/** Las páginas de los pacientes (reservas, pago y su cita): siempre siguen a su aparato. */
const PATIENT_PATH = /^\/(book|pago|cita)\//;
const DARK_QUERY = "(prefers-color-scheme: dark)";

export const isPatientPath = (pathname: string) => PATIENT_PATH.test(pathname);

export const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === "string" && Object.hasOwn(THEME_MODE_LABELS, value);

/** «Automático» sigue al aparato; uno que no informa su modo se ve claro. */
export function resolveMode(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  return mode === "dark" || (mode === "auto" && prefersDark) ? "dark" : "light";
}

/** Sin nada guardado, o si el navegador no deja leerlo: «Automático». */
export function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

export function storeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Sin almacenamiento: el próximo arranque sigue al aparato hasta que llegue la cuenta.
  }
}

export function devicePrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

/** Avisa cuando el aparato cambia de modo (p. ej. al anochecer), para «Automático». */
export function subscribeDeviceMode(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Pone o quita `dark` en <html> y pone la barra del celular del color del modo. */
export function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  syncThemeColor();
}

/**
 * La barra del celular (`theme-color`), del fondo de la pantalla: el del modo y, con colores
 * propios, el de la marca. Se llama al cambiar el modo y al poner o quitar los colores de un negocio.
 */
export function syncThemeColor() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const background = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
  if (meta && background) meta.content = background;
}
