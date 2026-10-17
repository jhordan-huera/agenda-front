/**
 * Contraste de las paletas (spec 019, research R8): `npm run check:contrast`.
 *
 * Mide la paleta de Agenda360, la de cada paleta lista (BRAND_PRESETS) y cuatro colores extremos
 * (casi negro, casi blanco, gris y chillón), en claro y en oscuro, con las mismas fórmulas que usa
 * la app. Pide 4,5:1 en los textos y 3:1 en lo que no es texto (la serie de los gráficos y los
 * colores de los profesionales) y en las horas sobre el marcador. Comprueba también que los colores
 * oscuros de Agenda360 escritos a mano (src/index.css, index.html, public/theme-boot.js y
 * CHART_COLORS_DARK) son los de la fórmula. Sale con código 1 si algo no llega o no coincide.
 *
 * Sin dependencias: Node ejecuta el .ts directamente.
 */
import { readFileSync } from "node:fs";
import { PROFESSIONAL_COLORS, PROFESSIONAL_MIN_CONTRAST, professionalColor } from "../src/features/professionals/colors.ts";
import { CHART_COLORS_DARK } from "../src/features/reports/chart-colors.ts";
import {
  BRAND_PRESETS,
  brandThemeVariables,
  contrastRatio,
  DEFAULT_BRAND_COLORS,
  resolveBrandPalette,
  type BrandPalette,
} from "../src/lib/brand-theme.ts";

type Mode = "light" | "dark";

interface Pair {
  label: string;
  min: number;
  /** Sólo en un modo (en el otro, la combinación no se da o es así desde antes de la spec 019). */
  only?: Mode;
  colors: (palette: BrandPalette) => [string, string];
}

const PAIRS: Pair[] = [
  { label: "Texto", min: 4.5, colors: (p) => [p.text, p.paper] },
  { label: "Secund.", min: 4.5, colors: (p) => [p.graphite, p.desk] },
  { label: "Princ.", min: 4.5, colors: (p) => [p.ink, p.paper] },
  { label: "Botón", min: 4.5, colors: (p) => [p.inkText, p.ink] },
  { label: "Resalt.", min: 4.5, colors: (p) => [p.text, p.highlight] },
  // Horas en el principal sobre el marcador (la hora actual de la agenda): en el claro es así desde antes.
  { label: "Marcador", min: 3, only: "dark", colors: (p) => [p.ink, p.highlight] },
  { label: "Insignia", min: 4.5, colors: (p) => [p.secondaryText, p.secondary] },
  // Lo activo del menú: en el claro se diseñó así en la spec 007; en el oscuro, el principal se aclara para esto.
  { label: "Menú", min: 4.5, only: "dark", colors: (p) => [p.ink, p.accent] },
  { label: "Error", min: 4.5, colors: (p) => [p.destructive, p.paper] },
  // El texto de los degradados (cabeceras, la portada), sobre su color más claro.
  { label: "Degrad.", min: 4.5, colors: (p) => [p.heroText, lighter(p.hero, p.heroEnd)] },
  { label: "Ejes", min: 4.5, colors: (p) => [p.chart.tick, p.paper] },
  { label: "Serie", min: 3, colors: (p) => [p.chart.series, p.paper] },
];

const EXTREMES = [
  { name: "Casi negro", hex: "#111111" },
  { name: "Casi blanco", hex: "#f5f5f5" },
  { name: "Gris", hex: "#808080" },
  { name: "Chillón", hex: "#00ff00" },
];

// Los extremos van en los dos colores a la vez: así se prueban el principal y el resaltado.
const PALETTES = [
  ...BRAND_PRESETS.map((preset) => ({ name: preset.name, colors: preset.colors ?? DEFAULT_BRAND_COLORS })),
  ...EXTREMES.map((extreme) => ({ name: `${extreme.name} ${extreme.hex}`, colors: { primary: extreme.hex, highlight: extreme.hex } })),
];

const MODE_LABEL: Record<Mode, string> = { light: "claro", dark: "oscuro" };

/** De dos fondos, el que menos contraste da con el texto claro: el más claro. */
function lighter(a: string, b: string) {
  return contrastRatio(a, "#000000") > contrastRatio(b, "#000000") ? a : b;
}
const format = (ratio: number) => ratio.toFixed(2).replace(".", ",");

const failures: string[] = [];
const header = ["Paleta".padEnd(22), "Modo  ", ...PAIRS.map((pair) => pair.label.padStart(8))].join(" ");
console.log(`Contraste de las paletas: ${PAIRS.filter((p) => p.min === 4.5).length} pares de texto (4,5:1); el marcador y la serie de los gráficos (3:1).\n`);
console.log(header);
console.log("-".repeat(header.length));

for (const { name, colors } of PALETTES) {
  const palettes = resolveBrandPalette(colors);
  for (const mode of ["light", "dark"] as const) {
    const cells = PAIRS.map((pair) => {
      if (pair.only && pair.only !== mode) return "—".padStart(8);
      const [foreground, background] = pair.colors(palettes[mode]);
      const ratio = contrastRatio(foreground, background);
      const ok = ratio >= pair.min;
      if (!ok) failures.push(`${name} (${MODE_LABEL[mode]}): ${pair.label} ${foreground} sobre ${background} = ${format(ratio)} (mínimo ${format(pair.min)})`);
      return `${ok ? "" : "✗ "}${format(ratio)}`.padStart(8);
    });
    console.log([name.padEnd(22), MODE_LABEL[mode].padEnd(6), ...cells].join(" "));
  }
}

// Los colores de cada profesional en la agenda (los puntos de cada agenda): 3:1 sobre el fondo de cada
// modo de Agenda360, con professionalColor(color, modo), lo mismo que pinta la app.
const agendaPapers = resolveBrandPalette(DEFAULT_BRAND_COLORS);
for (const mode of ["light", "dark"] as const) {
  const paper = agendaPapers[mode].paper;
  const professionals = PROFESSIONAL_COLORS.map((stored) => {
    const color = professionalColor(stored, mode);
    const ratio = contrastRatio(color, paper);
    if (ratio < PROFESSIONAL_MIN_CONTRAST) {
      failures.push(`Profesional ${stored} (${MODE_LABEL[mode]}: ${color}) sobre ${paper} = ${format(ratio)} (mínimo ${PROFESSIONAL_MIN_CONTRAST})`);
    }
    return `${color === stored ? color : `${stored}→${color}`} ${format(ratio)}`;
  });
  console.log(`${mode === "light" ? "\n" : ""}Profesionales (${MODE_LABEL[mode]}, mínimo ${PROFESSIONAL_MIN_CONTRAST} sobre ${paper}): ${professionals.join(" · ")}`);
}


// Los tokens oscuros de Agenda360 están escritos a mano en src/index.css y en CHART_COLORS_DARK: deben
// ser los de la fórmula. Si la fórmula cambia, aquí se ve qué copiar.
const agendaDark = resolveBrandPalette(DEFAULT_BRAND_COLORS).dark;
const darkBlock = /:root\.dark\s*\{([^}]*)\}/.exec(readFileSync(new URL("../src/index.css", import.meta.url), "utf8"))?.[1] ?? "";
const cssTokens = Object.fromEntries([...darkBlock.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
const expected = brandThemeVariables(agendaDark);
const drift = Object.entries(cssTokens).filter(([name, value]) => name in expected && expected[name] !== value);
for (const [name, value] of drift) failures.push(`src/index.css (:root.dark) ${name}: ${value}, la fórmula da ${expected[name]}`);
for (const [name, value] of Object.entries(agendaDark.chart)) {
  const written = CHART_COLORS_DARK[name as keyof typeof CHART_COLORS_DARK];
  if (written !== value) failures.push(`CHART_COLORS_DARK.${name}: ${written}, la fórmula da ${value}`);
}
console.log(`Tokens oscuros de Agenda360 en src/index.css: ${Object.keys(cssTokens).length} revisados, ${drift.length} distintos de la fórmula.`);

// La pantalla de carga de index.html y public/theme-boot.js llevan los mismos colores, escritos a mano.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const bootBlock = /html\.dark \.boot-loader\s*\{([^}]*)\}/.exec(read("../index.html"))?.[1] ?? "";
const bootExpected = { "--boot-ink": agendaDark.ink, "--boot-paper": agendaDark.paper, "--boot-highlight": agendaDark.highlight, "--boot-soft": agendaDark.chart.soft };
for (const [name, value] of Object.entries(bootExpected)) {
  if (!new RegExp(`${name}:\\s*${value};`).test(bootBlock)) failures.push(`index.html (html.dark .boot-loader) ${name}: debe ser ${value}`);
}
if (!new RegExp(`html\\.dark \\{\\s*background: ${agendaDark.paper};`).test(read("../index.html"))) failures.push(`index.html (html.dark): el fondo debe ser ${agendaDark.paper}`);
if (!read("../public/theme-boot.js").includes(`dark ? "${agendaDark.paper}"`)) failures.push(`public/theme-boot.js: el theme-color oscuro debe ser ${agendaDark.paper}`);

if (failures.length) {
  console.error(`\nNo pasa (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nTodo se lee: ${PALETTES.length} paletas, en claro y en oscuro.`);
