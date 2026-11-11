/**
 * La portada «Panel de marca» (spec 043): `npm run check:landing`.
 *
 * - Las reglas de la portada en sus textos: sin la LOPDP (sólo en /privacidad), sin precios, porcentajes ni
 *   testimonios inventados, y sin funciones paradas (la sincronización con Google y la suscripción de iPhone/iPad).
 * - Lo que se quitó no vuelve: ni mayúsculas espaciadas, ni letra monoespaciada, ni palabras sueltas en cursiva,
 *   ni las fuentes de la portada anterior.
 * - Lo que tiene que estar: el título aprobado, las 8 funciones, las 3 promesas, las 7 preguntas, la marca «Ejemplo»
 *   en la agenda de la semana y una sola familia de letra.
 *
 * Lee el código de las piezas como texto: muchas llevan ilustraciones y no se pueden importar desde Node. Sale con
 * código 1 si algo falla.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { LANDING_HERO } from "../src/features/landing/landing-constants.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const LANDING_DIR = path.join(ROOT, "src/features/landing");
let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 300));
  }
};

const read = (file: string) => readFileSync(file, "utf8");
const pieces = readdirSync(LANDING_DIR)
  .filter((file) => /\.(tsx?|css)$/.test(file))
  .map((file) => ({ file: `src/features/landing/${file}`, source: read(path.join(LANDING_DIR, file)) }));
const pages = ["src/pages/landing-page.tsx", "src/pages/specialty-page.tsx"].map((file) => ({ file, source: read(path.join(ROOT, file)) }));
const all = [...pieces, ...pages];

/** Código y no texto: cada palabra son minúsculas, números y signos (clases, rutas, cálculos de estilo). */
const isCode = (text: string) => text.trim().split(/\s+/).every((token) => /^[a-z0-9:[\]/().,%_#!&*+=-]*$/.test(token));

/** Sólo lo que se ve: el texto entre comillas y el de JSX, sin los comentarios, las clases ni lo que va en `${…}`. */
function visibleText(source: string): string {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const strings = [...withoutComments.matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map((match) => (match[1] ?? match[2] ?? "").replace(/\$\{[^}]*\}/g, " "));
  const jsxText = [...withoutComments.matchAll(/>([^<>{}]+)</g)].map((match) => match[1]);
  return [...strings, ...jsxText].filter((text) => !isCode(text)).join("\n");
}

/** Lo que nunca va en la portada (constitución, principio III). */
const FORBIDDEN: [RegExp, string][] = [
  [/LOPDP|protección de datos personales/i, "la LOPDP"],
  [/\$\s?\d|\d\s?(USD|dólares)/i, "un precio"],
  [/\d\s?%/, "un porcentaje"],
  [/testimoni|nuestros clientes dicen|opiniones de/i, "un testimonio"],
  [/sincroniz/i, "la sincronización con Google"],
  [/suscripci[oó]n|iPad|App Store/i, "la suscripción de iPhone/iPad"],
];

console.log("Los textos");
for (const { file, source } of all) {
  const text = visibleText(source);
  const found = FORBIDDEN.filter(([pattern]) => pattern.test(text)).map(([, what]) => what);
  ok(found.length === 0, `${file}: sin LOPDP, precios, porcentajes, testimonios ni funciones paradas`, found);
}

console.log("Lo que se quitó (spec 043)");
const REMOVED: [RegExp, string][] = [
  [/\buppercase\b/, "mayúsculas"],
  [/tracking-\[0\.1\d*em\]|tracking-widest/, "letras espaciadas"],
  [/font-tech|font-mono|font-wide|font-accent|\bitalic\b/, "monoespaciada, ancha o cursiva"],
  [/@fontsource-variable\/archivo|@fontsource-variable\/geist-mono|@fontsource\/instrument-serif/, "las fuentes de la portada anterior"],
  [/TECH_LABEL|WIDE_HEADING|SectionBar|<Accent/, "las piezas de la portada anterior"],
];
for (const { file, source } of all) {
  const found = REMOVED.filter(([pattern]) => pattern.test(source)).map(([, what]) => what);
  ok(found.length === 0, `${file}: sin lo que se quitó`, found);
}
const css = read(path.join(ROOT, "src/index.css"));
ok(!/--font-(wide|tech|accent)\b/.test(css) && /--font-display:\s*"Schibsted Grotesk Variable"/.test(css), "index.css: una sola familia para la portada (--font-display)");
const fontImports = all.flatMap(({ source }) => [...source.matchAll(/import "@fontsource[^"]+"/g)].map((match) => match[0]));
ok(
  fontImports.length > 0 && fontImports.every((line) => line.includes("@fontsource-variable/schibsted-grotesk")),
  "la portada y las páginas por especialidad sólo cargan Schibsted Grotesk",
  fontImports,
);

console.log("Lo que tiene que estar");
const source = (name: string) => pieces.find((piece) => piece.file.endsWith(`/${name}`))?.source ?? "";
ok(LANDING_HERO.title === "Tu consulta, ordenada desde la primera reserva.", "el título aprobado del panel (respuesta 3)", LANDING_HERO.title);
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;
const featuresBlock = source("features-section.tsx").split("const FEATURES")[1]?.split("];")[0] ?? "";
ok(count(featuresBlock, /^\s{4}title: "/gm) === 8, "las 8 funciones", count(featuresBlock, /^\s{4}title: "/gm));
const promisesBlock = source("data-section.tsx").split("const PROMISES")[1]?.split("];")[0] ?? "";
ok(count(promisesBlock, /^\s{4}title: "/gm) === 3, "las 3 promesas de «Tus datos»", count(promisesBlock, /^\s{4}title: "/gm));
ok(count(source("faq-section.tsx"), /^\s{6}question: "/gm) === 7, "las 7 preguntas", count(source("faq-section.tsx"), /^\s{6}question: "/gm));
ok(/>Ejemplo</.test(source("week-preview.tsx")), "la agenda de la semana dice «Ejemplo»");
ok(/datos de ejemplo/.test(source("features-section.tsx")), "las ilustraciones dicen que usan datos de ejemplo");
ok(/id=\{LANDING_SECTIONS\.specialties\}/.test(source("specialties-row.tsx")), "«Hecho para» es el destino de «Especialidades» (#especialidades)");

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: la portada cumple sus reglas y no quedan restos de la anterior.");
