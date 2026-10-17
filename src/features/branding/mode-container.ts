import type { CSSProperties } from "react";
import type { ResolvedTheme } from "@/features/theme/theme-mode";
import { brandThemeVariables, type BrandPalettes } from "@/lib/brand-theme";

/**
 * Un contenedor en un modo concreto (spec 019): su clase (`light` o `dark`) y las variables de ese
 * modo de la paleta. Se ve igual sea cual sea el modo de la pantalla (la vista previa de los colores
 * y los dibujos de «Modo de pantalla»).
 */
export function modeContainer(palettes: BrandPalettes, mode: ResolvedTheme) {
  return {
    className: mode,
    style: { ...brandThemeVariables(palettes[mode]), colorScheme: mode } as CSSProperties,
  };
}
