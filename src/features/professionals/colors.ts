import type { ResolvedTheme } from "@/features/theme/theme-mode";
// Relativo y con .ts: scripts/check-contrast.ts importa este archivo con Node, que no conoce el alias @/.
import { contrastRatio, DEFAULT_BRAND_COLORS, resolveBrandPalette } from "../../lib/brand-theme.ts";

/** Colores de las agendas en el calendario: distintos entre sí y legibles sobre fondo claro. */
export const PROFESSIONAL_COLORS = ["#4a6cb0", "#b0478f", "#2f8f6b", "#c2702a", "#7a5cc4", "#2b8fb3", "#b8433f", "#6b7a2f"];

/** Contraste mínimo de un color que no es texto (los puntos de cada agenda) sobre el fondo. */
export const PROFESSIONAL_MIN_CONTRAST = 3;

/** El fondo oscuro de Agenda360: con colores propios, el del negocio tiene la misma claridad (research R4). */
export const PROFESSIONAL_DARK_PAPER = resolveBrandPalette(DEFAULT_BRAND_COLORS).dark.paper;

const darkColors = new Map<string, string>();

/**
 * El color de una agenda en el modo de la pantalla (spec 019, research R6). En el claro, el suyo. En el
 * oscuro, el mismo tono aclarado lo justo para llegar a 3:1 sobre el fondo oscuro. Los ocho de
 * PROFESSIONAL_COLORS ya llegan y no cambian; sólo se aclara un color guardado que no llegue.
 */
export function professionalColor(color: string, mode: ResolvedTheme): string {
  if (mode === "light") return color;
  let dark = darkColors.get(color);
  if (!dark) {
    dark = lightenUntilVisible(color);
    darkColors.set(color, dark);
  }
  return dark;
}

/**
 * Sube la claridad (HSL) de a un punto, con el mismo tono y la misma saturación, hasta 3:1 sobre el fondo
 * oscuro. Un color que no se puede leer como #RRGGBB queda como está.
 */
function lightenUntilVisible(color: string): string {
  const hsl = hexToHsl(color);
  if (!hsl) return color;
  let candidate = color;
  for (let l = hsl.l; contrastRatio(candidate, PROFESSIONAL_DARK_PAPER) < PROFESSIONAL_MIN_CONTRAST && l < 1; ) {
    l = Math.min(1, l + 0.01);
    candidate = hslToHex({ ...hsl, l });
  }
  return candidate;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return null;
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}
