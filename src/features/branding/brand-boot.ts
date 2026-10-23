import { useLayoutEffect } from "react";
import { useLocation } from "react-router";
import { brandThemeCss, type BrandPalette, type BrandPalettes } from "@/lib/brand-theme";

/*
 * La pantalla de carga con los colores propios del panel. La app sólo los conoce al cargar la sesión o el
 * negocio, y la pantalla de carga sale antes: por eso BrandThemeProvider los recuerda en este equipo y
 * public/theme-boot.js los pone desde el primer instante, sólo en /dashboard y /admin. La portada, el
 * login y las páginas de los pacientes conservan los de Agenda360.
 */

/** La clave en localStorage. public/theme-boot.js lee la misma. */
export const BRAND_BOOT_KEY = "agenda360:colores-carga";

/** El panel de un negocio o el de plataforma: cada uno con los suyos. */
export type BrandBootArea = "dashboard" | "admin";

export const bootAreaOf = (pathname: string): BrandBootArea | null =>
  /^\/dashboard(\/|$)/.test(pathname) ? "dashboard" : /^\/admin(\/|$)/.test(pathname) ? "admin" : null;

/** Lo que usa theme-boot.js de cada modo: las variables del panel y las de la pantalla de index.html. */
const bootMode = (palette: BrandPalette) => ({
  css: brandThemeCss(palette),
  ink: palette.ink,
  paper: palette.paper,
  highlight: palette.highlight,
  soft: palette.chart.soft,
});

function readStored(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BRAND_BOOT_KEY) ?? "{}");
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Recuerda los colores de ese panel; null (los de Agenda360) los olvida. */
export function rememberBootColors(area: BrandBootArea, palettes: BrandPalettes | null) {
  const stored = readStored();
  if (palettes) stored[area] = { light: bootMode(palettes.light), dark: bootMode(palettes.dark) };
  else delete stored[area];
  try {
    if (Object.keys(stored).length > 0) localStorage.setItem(BRAND_BOOT_KEY, JSON.stringify(stored));
    else localStorage.removeItem(BRAND_BOOT_KEY);
  } catch {
    // Sin almacenamiento: la pantalla de carga sale con los de Agenda360.
  }
}

/** Olvida todos: al cerrar sesión, porque otra persona puede entrar en este equipo. */
export function forgetBootColors() {
  try {
    localStorage.removeItem(BRAND_BOOT_KEY);
  } catch {
    // Sin almacenamiento.
  }
}

/** Quita los que puso theme-boot.js: ya los pone BrandThemeProvider, o la página no es de un panel. */
export function dropBootColors() {
  document.querySelector("style[data-brand-boot]")?.remove();
  document.documentElement.classList.remove("brand-boot");
}

/** En el RootLayout: fuera de los paneles (p. ej. la sesión caducó y se va al login), fuera los recordados. */
export function BrandBootRouteSync() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (!bootAreaOf(pathname)) dropBootColors();
  }, [pathname]);
  return null;
}
