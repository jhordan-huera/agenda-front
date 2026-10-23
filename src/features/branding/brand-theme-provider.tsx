import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { syncThemeColor } from "@/features/theme/theme-mode";
import { brandThemeCss, resolveBrandPalette } from "@/lib/brand-theme";
import type { BrandColors } from "@/types";
import { dropBootColors, rememberBootColors, type BrandBootArea } from "./brand-boot";
import { BrandPaletteContext } from "./brand-palette-context";

interface BrandThemeProviderProps {
  /** null o sin cargar: los colores de Agenda360. */
  colors: BrandColors | null | undefined;
  /**
   * El panel (el del negocio o el de plataforma): sus colores se recuerdan en este equipo para que la
   * pantalla de carga salga ya con ellos (ver brand-boot.ts). Las páginas de los pacientes no lo llevan.
   */
  remember?: BrandBootArea;
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
  remember,
  children,
}: BrandThemeProviderProps) {
  const primary = colors?.primary;
  const highlight = colors?.highlight;
  const palettes = useMemo(
    () =>
      primary && highlight ? resolveBrandPalette({ primary, highlight }) : null,
    [primary, highlight],
  );

  // Ya se sabe qué colores lleva (null: los de Agenda360). Mientras carga se quedan los recordados.
  const known = colors !== undefined;
  useLayoutEffect(() => {
    if (!known) return;
    if (remember) rememberBootColors(remember, palettes);
    if (!palettes) {
      dropBootColors();
      syncThemeColor();
    }
  }, [known, remember, palettes]);

  useLayoutEffect(() => {
    if (!palettes) return;
    const style = document.createElement("style");
    style.setAttribute("data-brand-theme", "");
    // `html:root` le gana a `:root` de index.css aunque su hoja llegue después (va al final del <body>).
    style.textContent = `html:root { ${brandThemeCss(palettes.light)} }\n@media screen { html:root.dark { ${brandThemeCss(palettes.dark)} } }`;
    document.head.append(style);
    // Los que puso theme-boot.js al cargar ya sobran (y le ganarían a estos).
    dropBootColors();
    // La barra del celular toma el fondo de la marca.
    syncThemeColor();
    return () => {
      style.remove();
      syncThemeColor();
    };
  }, [palettes]);

  return <BrandPaletteContext value={palettes}>{children}</BrandPaletteContext>;
}
