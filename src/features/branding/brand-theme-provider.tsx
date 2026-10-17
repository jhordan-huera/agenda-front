import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { syncThemeColor } from "@/features/theme/theme-mode";
import { brandThemeCss, resolveBrandPalette } from "@/lib/brand-theme";
import type { BrandColors } from "@/types";
import { BrandPaletteContext } from "./brand-palette-context";

interface BrandThemeProviderProps {
  /** null o sin cargar: los colores de Agenda360. */
  colors: BrandColors | null | undefined;
  children: ReactNode;
}

/**
 * Viste con los colores del negocio todo lo que hay debajo: el panel o su página de reservas.
 * Las variables van en un <style> de la página, para que también las tomen los diálogos y menús
 * (se abren fuera de este árbol): las claras en `:root` y las oscuras en `:root.dark`, sólo en
 * pantalla (spec 019). Así, cambiar de modo es sólo cambiar la clase de <html>, y al imprimir salen
 * siempre las claras. Se quita al salir: la portada y el login conservan los de Agenda360.
 */
export function BrandThemeProvider({
  colors,
  children,
}: BrandThemeProviderProps) {
  const primary = colors?.primary;
  const highlight = colors?.highlight;
  const palettes = useMemo(
    () =>
      primary && highlight ? resolveBrandPalette({ primary, highlight }) : null,
    [primary, highlight],
  );

  useLayoutEffect(() => {
    if (!palettes) return;
    const style = document.createElement("style");
    style.setAttribute("data-brand-theme", "");
    // `html:root` le gana a `:root` de index.css aunque su hoja llegue después (va al final del <body>).
    style.textContent = `html:root { ${brandThemeCss(palettes.light)} }\n@media screen { html:root.dark { ${brandThemeCss(palettes.dark)} } }`;
    document.head.append(style);
    // La barra del celular toma el fondo de la marca.
    syncThemeColor();
    return () => {
      style.remove();
      syncThemeColor();
    };
  }, [palettes]);

  return <BrandPaletteContext value={palettes}>{children}</BrandPaletteContext>;
}
