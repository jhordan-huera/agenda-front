import { createContext, useContext } from "react";
import type { ThemeMode } from "@/types";
import type { ResolvedTheme } from "./theme-mode";

export interface ThemeModeContextValue {
  /** Lo que eligió la persona: el de su cuenta o, sin sesión, la última elección de este aparato. */
  mode: ThemeMode;
  /** Cómo se ve ahora: «Automático» ya resuelto y, en las páginas de los pacientes, su aparato. */
  resolved: ResolvedTheme;
  /** Con sesión, se guarda en la cuenta (se ve al instante y vuelve atrás si falla); sin ella, en este aparato. */
  setMode: (mode: ThemeMode) => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

/** El modo de pantalla (spec 019). */
export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) throw new Error("useThemeMode debe usarse dentro de <ThemeModeProvider>");
  return context;
}

/** Para ThemeRouteSync: la página en la que se está (el proveedor vive fuera del router). */
export const ThemeRouteContext = createContext<((pathname: string) => void) | null>(null);
