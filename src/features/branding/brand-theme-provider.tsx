import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { brandThemeVariables, resolveBrandPalette } from "@/lib/brand-theme";
import type { BrandColors } from "@/types";
import { BrandPaletteContext } from "./brand-palette-context";

interface BrandThemeProviderProps {
  /** null o sin cargar: los colores de Agenda360. */
  colors: BrandColors | null | undefined;
  children: ReactNode;
}

/**
 * Viste con los colores del negocio todo lo que hay debajo: el panel o su página de reservas.
 * Las variables van en <html> para que también las tomen los diálogos y menús (se abren fuera
 * de este árbol) y se quitan al salir, así la portada y el login conservan los de Agenda360.
 */
export function BrandThemeProvider({
  colors,
  children,
}: BrandThemeProviderProps) {
  const primary = colors?.primary;
  const highlight = colors?.highlight;
  const palette = useMemo(
    () =>
      primary && highlight ? resolveBrandPalette({ primary, highlight }) : null,
    [primary, highlight],
  );

  useLayoutEffect(() => {
    if (!palette) return;
    const style = document.documentElement.style;
    const variables = brandThemeVariables(palette);
    for (const [name, value] of Object.entries(variables))
      style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(variables)) style.removeProperty(name);
    };
  }, [palette]);

  return <BrandPaletteContext value={palette}>{children}</BrandPaletteContext>;
}
