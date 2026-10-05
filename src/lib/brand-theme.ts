import type { ChartColors } from "@/features/reports/chart-colors";
import type { BrandColors } from "@/types";

/**
 * Colores de marca de cada negocio. El negocio elige dos colores (el principal y el de resaltado)
 * y de ellos sale toda la paleta del panel y de su página de reservas: superficies, bordes, textos
 * y gráficos, en el mismo tono. Los cálculos se hacen en OKLCH (claridad, croma y tono), que
 * reparte la claridad como la percibe el ojo.
 *
 * Sin colores propios (null) se usan los de Agenda360, definidos en src/index.css.
 */

export const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: "#4a6cb0",
  highlight: "#ddd4f8",
};

export interface BrandPreset {
  id: string;
  name: string;
  /** null: los colores de Agenda360. */
  colors: BrandColors | null;
}

/** Paletas listas: tonos suaves y profesionales, todas legibles. */
export const BRAND_PRESETS: BrandPreset[] = [
  { id: "agenda360", name: "Agenda360", colors: null },
  {
    id: "eucalipto",
    name: "Eucalipto",
    colors: { primary: "#2f6b5e", highlight: "#ddd4f8" },
  },
  {
    id: "lavanda",
    name: "Lavanda",
    colors: { primary: "#6650a8", highlight: "#f7d6e6" },
  },
  {
    id: "rosa",
    name: "Rosa",
    colors: { primary: "#a34d6d", highlight: "#f9dccb" },
  },
  {
    id: "turquesa",
    name: "Turquesa",
    colors: { primary: "#1f6f7a", highlight: "#fde3c7" },
  },
  {
    id: "coral",
    name: "Coral",
    colors: { primary: "#b0503b", highlight: "#c9ece6" },
  },
  {
    id: "oliva",
    name: "Oliva",
    colors: { primary: "#55703d", highlight: "#efe3c2" },
  },
  {
    id: "grafito",
    name: "Grafito",
    colors: { primary: "#424b5c", highlight: "#d9e6f7" },
  },
];

export const HEX_COLOR = /^#[0-9a-f]{6}$/;

/** "#ABC" o "abc123" → "#aabbcc"; null si no es un color. */
export function normalizeHex(value: string): string | null {
  let hex = value.trim().toLowerCase();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9a-f]{3}$/.test(hex))
    hex = `#${[...hex.slice(1)].map((c) => c + c).join("")}`;
  return HEX_COLOR.test(hex) ? hex : null;
}

export const sameColors = (a: BrandColors | null, b: BrandColors | null) =>
  a?.primary === b?.primary && a?.highlight === b?.highlight;

/** Paleta que sale de un negocio con colores propios. */
export interface BrandPalette {
  /** Botones, títulos y lo activo (ya legible con texto blanco encima). */
  ink: string;
  /** El principal se oscureció para que el texto blanco se lea (contraste 4,5:1). */
  inkAdjusted: boolean;
  accent: string;
  desk: string;
  sidebarAccent: string;
  text: string;
  graphite: string;
  sidebarText: string;
  highlight: string;
  highlightAdjusted: boolean;
  /** Tono suave del resaltado (insignias, botones secundarios) y su texto. */
  secondary: string;
  secondaryText: string;
  chart: ChartColors;
  /** Bordes y campos: el color del texto con transparencia. */
  textRgb: string;
}

/* ------------------------------ Conversiones ------------------------------ */

type Rgb = [number, number, number];
interface Oklch {
  l: number;
  c: number;
  h: number;
}

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const toGamma = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
}

function rgbToHex(rgb: Rgb): string {
  return `#${rgb
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function rgbToOklch(rgb: Rgb): Oklch {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    l: L,
    c: Math.hypot(A, B),
    h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360,
  };
}

/** RGB lineal (puede salirse de 0–1 si el color no existe en pantalla). */
function oklchToLinear({ l, c, h }: Oklch): Rgb {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((c) => c >= -0.0001 && c <= 1.0001);

/** A pantalla: si el color no cabe, se le baja el croma (mantiene claridad y tono). */
function oklchToHex(color: Oklch): string {
  let { c } = color;
  let linear = oklchToLinear({ ...color, c });
  if (!inGamut(linear)) {
    let low = 0;
    let high = c;
    for (let i = 0; i < 20; i++) {
      c = (low + high) / 2;
      if (inGamut(oklchToLinear({ ...color, c }))) low = c;
      else high = c;
    }
    linear = oklchToLinear({ ...color, c: low });
  }
  return rgbToHex(linear.map(toGamma) as Rgb);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Si `hex` no cumple `ok`, mueve su claridad (`step` < 0 oscurece) hasta que cumpla. */
function adjustLightness(
  hex: string,
  step: number,
  ok: (candidate: string) => boolean,
): string {
  if (ok(hex)) return hex;
  let current = rgbToOklch(hexToRgb(hex));
  let candidate = hex;
  while (!ok(candidate) && current.l > 0.05 && current.l < 0.99) {
    current = { ...current, l: current.l + step };
    candidate = oklchToHex(current);
  }
  return candidate;
}

/* -------------------------------- Paleta ---------------------------------- */

const WHITE = "#ffffff";
/** Croma del azul de Agenda360: las superficies se calibraron con él. */
const BASE_PRIMARY_CHROMA = 0.114;
const BASE_HIGHLIGHT_CHROMA = 0.05;

export function resolveBrandPalette(colors: BrandColors): BrandPalette {
  const primary = rgbToOklch(hexToRgb(colors.primary));
  const highlight = rgbToOklch(hexToRgb(colors.highlight));
  // Un principal gris da superficies grises; uno muy saturado no las vuelve chillonas.
  const k = Math.min(primary.c / BASE_PRIMARY_CHROMA, 1.25);
  const kh = Math.min(highlight.c / BASE_HIGHLIGHT_CHROMA, 1.25);
  const tone = (l: number, c: number) =>
    oklchToHex({ l, c: c * k, h: primary.h });
  const highlightTone = (l: number, c: number) =>
    oklchToHex({ l, c: c * kh, h: highlight.h });

  const text = tone(0.261, 0.0301);
  const ink = adjustLightness(
    colors.primary,
    -0.01,
    (hex) => contrastRatio(hex, WHITE) >= 4.5,
  );
  const highlightHex = adjustLightness(
    colors.highlight,
    0.01,
    (hex) => contrastRatio(hex, text) >= 4.5,
  );
  const secondary = highlightTone(0.948, 0.0231);
  const desk = tone(0.976, 0.007);
  const [r, g, b] = hexToRgb(text).map((c) => Math.round(c * 255));

  return {
    ink,
    inkAdjusted: ink !== colors.primary,
    accent: tone(0.948, 0.0187),
    desk,
    sidebarAccent: tone(0.939, 0.0204),
    text,
    graphite: adjustLightness(
      tone(0.503, 0.0338),
      -0.01,
      (hex) => contrastRatio(hex, desk) >= 4.5,
    ),
    sidebarText: tone(0.311, 0.0378),
    highlight: highlightHex,
    highlightAdjusted: highlightHex !== colors.highlight,
    secondary,
    secondaryText: adjustLightness(
      highlightTone(0.479, 0.1322),
      -0.01,
      (hex) => contrastRatio(hex, secondary) >= 4.5,
    ),
    chart: {
      series: adjustLightness(
        oklchToHex({ l: 0.652, c: primary.c * 0.93, h: primary.h }),
        -0.01,
        (hex) => contrastRatio(hex, WHITE) >= 3,
      ),
      soft: tone(0.798, 0.0651),
      highlight: highlightTone(0.727, 0.0996),
      grid: tone(0.928, 0.0129),
      axis: tone(0.882, 0.019),
      tick: tone(0.503, 0.0338),
      cursor: desk,
    },
    textRgb: `${r} ${g} ${b}`,
  };
}

/**
 * Variables CSS de la paleta. Se dan todas (no sólo las de base) porque `--primary: var(--ink)`
 * se resuelve donde se declara: así también sirven en un contenedor (la vista previa).
 */
export function brandThemeVariables(
  palette: BrandPalette,
): Record<string, string> {
  const rule = (alpha: number) => `rgb(${palette.textRgb} / ${alpha})`;
  return {
    "--ink": palette.ink,
    "--primary": palette.ink,
    "--ring": palette.ink,
    "--chart-1": palette.ink,
    "--accent": palette.accent,
    "--accent-foreground": palette.ink,
    "--desk": palette.desk,
    "--muted": palette.desk,
    "--text": palette.text,
    "--foreground": palette.text,
    "--card-foreground": palette.text,
    "--popover-foreground": palette.text,
    "--graphite": palette.graphite,
    "--muted-foreground": palette.graphite,
    "--rule": rule(0.1),
    "--border": rule(0.1),
    "--rule-strong": rule(0.18),
    "--input": rule(0.18),
    "--field": rule(0.025),
    "--highlight": palette.highlight,
    "--highlight-foreground": palette.text,
    "--secondary": palette.secondary,
    "--secondary-foreground": palette.secondaryText,
    "--lilac-ink": palette.secondaryText,
    "--chart-2": palette.chart.soft,
    "--chart-3": palette.chart.highlight,
    "--sidebar": palette.desk,
    "--sidebar-foreground": palette.sidebarText,
    "--sidebar-primary": palette.ink,
    "--sidebar-accent": palette.sidebarAccent,
    "--sidebar-accent-foreground": palette.ink,
    "--sidebar-border": rule(0.1),
    "--sidebar-ring": palette.ink,
  };
}
