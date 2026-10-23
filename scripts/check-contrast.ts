/**
 * Contraste de las paletas (spec 019, research R8): `npm run check:contrast`.
 *
 * Mide la paleta de Agenda360, la de cada paleta lista (BRAND_PRESETS) y cuatro colores extremos
 * (casi negro, casi blanco, gris y chillón), en claro y en oscuro, con las mismas fórmulas que usa
 * la app. Pide 4,5:1 en los textos y 3:1 en lo que no es texto (la serie de los gráficos y los
 * colores de los profesionales) y en las horas sobre el marcador. Comprueba también que los colores
 * de Agenda360 escritos a mano, en el claro y en el oscuro (src/index.css, index.html,
 * public/theme-boot.js, public/manifest.webmanifest, CHART_COLORS, CHART_COLORS_DARK y los de los
 * emails), son los de la fórmula (spec 033). Sale con código 1 si algo no llega o no coincide.
 *
 * Sin dependencias: Node ejecuta el .ts directamente.
 */
import { readFileSync } from "node:fs";
import { PROFESSIONAL_COLORS, PROFESSIONAL_MIN_CONTRAST, professionalColor } from "../src/features/professionals/colors.ts";
import { CHART_COLORS, CHART_COLORS_DARK } from "../src/features/reports/chart-colors.ts";
import { EMAIL_COLORS } from "../src/lib/email/layout.ts";
import {
  BRAND_PRESETS,
  brandThemeCss,
  brandThemeVariables,
  contrastRatio,
  DEFAULT_BRAND_COLORS,
  HEX_COLOR,
  mixWithOklch,
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

// La portada (spec 032) y el acceso (spec 030). Desde src/index.css, en el claro (:root) y en el oscuro
// (:root.dark):
// - la pared (--wall, los recuadros del acceso) con el texto, el gris y el principal de Agenda360;
// - el verde de «confirmado» (--confirmed), sobre el papel, la pared y su propio tono al 10 % (la insignia
//   «Confirmó que va», mezclado en sRGB: una aproximación de color-mix);
// - el lienzo de la portada (--canvas, el del panel) con el texto, el gris y el principal (el titular);
// - el botón principal al pasar el ratón (spec 033: es el principal de la marca, sin un naranja aparte): en
//   el claro, el del botón de siempre (color-mix con negro al 18 %); en el oscuro, SignupCta lo aclara (con
//   blanco al 15 %), porque su texto es oscuro;
// - el cierre (--shell, casi negro con el tono de la marca): su texto, puro y al 75 %.
// Todo a 4,5:1.
const indexCss = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const tokensOf = (block: string) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
const lightTokens = tokensOf(/:root\s*\{([^}]*)\}/.exec(indexCss)?.[1] ?? "");
const landingTokens: Record<Mode, Record<string, string>> = {
  light: lightTokens,
  dark: { ...lightTokens, ...tokensOf(/:root\.dark\s*\{([^}]*)\}/.exec(indexCss)?.[1] ?? "") },
};
const mixHex = (color: string, base: string, share: number) =>
  `#${[1, 3, 5]
    .map((at) => Math.round(parseInt(color.slice(at, at + 2), 16) * share + parseInt(base.slice(at, at + 2), 16) * (1 - share)))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
for (const mode of ["light", "dark"] as const) {
  const palette = agendaPapers[mode];
  const tokens = landingTokens[mode];
  const names = ["--wall", "--confirmed"];
  const missing = names.filter((name) => !tokens[name] || !HEX_COLOR.test(tokens[name]));
  if (missing.length) {
    failures.push(`src/index.css (${MODE_LABEL[mode]}): faltan ${missing.join(", ")} como colores #rrggbb`);
    continue;
  }
  const { "--wall": wall, "--confirmed": confirmed } = tokens;
  const hover = mode === "light" ? mixWithOklch(palette.ink, "black", 0.18) : mixWithOklch(palette.ink, "white", 0.15);
  const pairs: [string, string, string][] = [
    ["Texto/pared", palette.text, wall],
    ["Gris/pared", palette.graphite, wall],
    ["Princ./pared", palette.ink, wall],
    ["Verde/papel", confirmed, palette.paper],
    ["Verde/pared", confirmed, wall],
    ["Verde/insignia", confirmed, mixHex(confirmed, palette.paper, 0.1)],
    ["Texto/lienzo", palette.text, palette.canvas],
    ["Gris/lienzo", palette.graphite, palette.canvas],
    ["Princ./lienzo", palette.ink, palette.canvas],
    ["Botón al pasar", palette.inkText, hover],
    ["Cierre", palette.shellText, palette.shell],
    ["Cierre 75 %", mixHex(palette.shellText, palette.shell, 0.75), palette.shell],
  ];
  const cells = pairs.map(([label, foreground, background]) => {
    const ratio = contrastRatio(foreground, background);
    if (ratio < 4.5) failures.push(`Portada (${MODE_LABEL[mode]}): ${label} ${foreground} sobre ${background} = ${format(ratio)} (mínimo 4,5)`);
    return `${label} ${ratio < 4.5 ? "✗ " : ""}${format(ratio)}`;
  });
  console.log(`${mode === "light" ? "\n" : ""}Portada (${MODE_LABEL[mode]}): ${cells.join(" · ")}`);
}

// Los tokens de Agenda360 están escritos a mano en src/index.css (el claro en :root y el oscuro en
// :root.dark), en CHART_COLORS y en CHART_COLORS_DARK: deben ser los de la fórmula. Un token que se apoya en
// otro (--primary: var(--ink)) vale lo que vale ese otro en el mismo modo. Si la fórmula o los colores de
// Agenda360 cambian, aquí se ve qué copiar.
const agenda = resolveBrandPalette(DEFAULT_BRAND_COLORS);
const agendaDark = agenda.dark;
const resolveVars = (tokens: Record<string, string>) => {
  const value = (raw: string, depth = 0): string => {
    const reference = /^var\((--[\w-]+)\)$/.exec(raw);
    return reference && tokens[reference[1]] && depth < 5 ? value(tokens[reference[1]], depth + 1) : raw;
  };
  return Object.fromEntries(Object.entries(tokens).map(([name, raw]) => [name, value(raw)]));
};
const writtenTokens: Record<Mode, Record<string, string>> = {
  light: resolveVars(lightTokens),
  dark: resolveVars(landingTokens.dark),
};
const ownTokens: Record<Mode, string[]> = { light: Object.keys(lightTokens), dark: Object.keys(tokensOf(/:root\.dark\s*\{([^}]*)\}/.exec(indexCss)?.[1] ?? "")) };
const chartsWritten: Record<Mode, [string, typeof CHART_COLORS]> = { light: ["CHART_COLORS", CHART_COLORS], dark: ["CHART_COLORS_DARK", CHART_COLORS_DARK] };
for (const mode of ["light", "dark"] as const) {
  const expected = brandThemeVariables(agenda[mode]);
  const checked = ownTokens[mode].filter((name) => name in expected);
  const drift = checked.filter((name) => writtenTokens[mode][name] !== expected[name]);
  const block = mode === "light" ? ":root" : ":root.dark";
  for (const name of drift) failures.push(`src/index.css (${block}) ${name}: ${writtenTokens[mode][name]}, la fórmula da ${expected[name]}`);
  const [chartName, chart] = chartsWritten[mode];
  for (const [name, value] of Object.entries(agenda[mode].chart)) {
    const written = chart[name as keyof typeof chart];
    if (written !== value) failures.push(`${chartName}.${name}: ${written}, la fórmula da ${value}`);
  }
  console.log(`${mode === "light" ? "\n" : ""}Tokens de Agenda360 en src/index.css (${MODE_LABEL[mode]}): ${checked.length} revisados, ${drift.length} distintos de la fórmula.`);
}

// Los emails (src/lib/email/layout.ts) llevan los del claro.
const agendaLight = agenda.light;
const emailExpected = {
  brand: agendaLight.ink,
  text: agendaLight.text,
  muted: agendaLight.graphite,
  border: agendaLight.chart.grid,
  page: agendaLight.desk,
  panel: agendaLight.desk,
  "info.bg": agendaLight.secondary,
  "info.border": agendaLight.highlight,
  "info.text": agendaLight.secondaryText,
};
const emailWritten: Record<string, string> = { ...EMAIL_COLORS, "info.bg": EMAIL_COLORS.info.bg, "info.border": EMAIL_COLORS.info.border, "info.text": EMAIL_COLORS.info.text } as never;
for (const [name, value] of Object.entries(emailExpected)) {
  if (emailWritten[name] !== value) failures.push(`src/lib/email/layout.ts EMAIL_COLORS.${name}: ${emailWritten[name]}, la fórmula da ${value}`);
}

// La pantalla de carga de index.html, public/theme-boot.js y el manifiesto llevan los mismos colores,
// escritos a mano: en cada modo, el logotipo como lo pinta BrandMark y el fondo (--background).
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const indexHtml = read("../index.html");
const bootBlocks: Record<Mode, string> = {
  light: /\.boot-loader\s*\{([^}]*)\}/.exec(indexHtml)?.[1] ?? "",
  dark: /html\.dark \.boot-loader\s*\{([^}]*)\}/.exec(indexHtml)?.[1] ?? "",
};
for (const mode of ["light", "dark"] as const) {
  const palette = agenda[mode];
  const bootExpected = { "--boot-ink": palette.ink, "--boot-paper": palette.paper, "--boot-highlight": palette.highlight, "--boot-soft": palette.chart.soft };
  const block = mode === "light" ? ".boot-loader" : "html.dark .boot-loader";
  for (const [name, value] of Object.entries(bootExpected)) {
    if (!new RegExp(`${name}:\\s*${value};`).test(bootBlocks[mode])) failures.push(`index.html (${block}) ${name}: debe ser ${value}`);
  }
}
if (!new RegExp(`html\\.dark \\{\\s*background: ${agendaDark.paper};`).test(indexHtml)) failures.push(`index.html (html.dark): el fondo debe ser ${agendaDark.paper}`);
if (!indexHtml.includes(`<meta name="theme-color" content="${agendaLight.paper}" />`)) failures.push(`index.html: el theme-color debe ser ${agendaLight.paper}`);
if (!read("../public/theme-boot.js").includes(`dark ? "${agendaDark.paper}" : "${agendaLight.paper}"`)) {
  failures.push(`public/theme-boot.js: el theme-color debe ser ${agendaDark.paper} en el oscuro y ${agendaLight.paper} en el claro`);
}
const manifest = JSON.parse(read("../public/manifest.webmanifest")) as { theme_color?: string; background_color?: string };
for (const key of ["theme_color", "background_color"] as const) {
  if (manifest[key] !== agendaLight.paper) failures.push(`public/manifest.webmanifest ${key}: ${manifest[key]}, debe ser ${agendaLight.paper}`);
}

// La pantalla de carga con los colores propios del panel (brand-boot.ts): public/theme-boot.js sólo acepta
// variables con colores. Las de todas las paletas, en los dos modos, tienen que pasar su filtro, o la
// pantalla de carga volvería en silencio a los de Agenda360.
const safeCss = /var SAFE_CSS = \/(.+)\/([a-z]*);/.exec(read("../public/theme-boot.js"));
if (!safeCss) failures.push("public/theme-boot.js: no encuentro SAFE_CSS");
else {
  const filter = new RegExp(safeCss[1], safeCss[2]);
  for (const preset of BRAND_PRESETS) {
    const palettes = resolveBrandPalette(preset.colors ?? DEFAULT_BRAND_COLORS);
    for (const mode of ["light", "dark"] as const) {
      if (!filter.test(brandThemeCss(palettes[mode]))) failures.push(`public/theme-boot.js: SAFE_CSS rechaza las variables de «${preset.name}» (${mode})`);
    }
  }
  if (filter.test("--ink: #fff; } body { background: url(x);")) failures.push("public/theme-boot.js: SAFE_CSS deja pasar CSS que no son colores");
}

if (failures.length) {
  console.error(`\nNo pasa (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nTodo se lee: ${PALETTES.length} paletas, en claro y en oscuro.`);
