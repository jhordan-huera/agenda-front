/**
 * Las páginas por especialidad (spec 041): `npm run check:specialties`.
 *
 * - Las reglas de la portada en sus textos: sin la LOPDP (sólo en /privacidad), sin precios, porcentajes ni
 *   testimonios, y sin funciones paradas (la sincronización con Google y la suscripción de iPhone/iPad).
 * - Cada especialidad completa: título y descripción para Google y para compartir (de un largo que se lea entero),
 *   6 casillas, 3 pasos, sus preguntas y el mensaje de WhatsApp.
 * - Lo que se publica: el HTML de cada una con su título, su descripción y sus etiquetas para compartir; la regla de
 *   vercel.json antes de la general; su ruta en el router; y el mapa del sitio sin páginas privadas.
 *
 * Sale con código 1 si algo falla.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { SPECIALTIES } from "../src/features/landing/specialties.ts";
import { SITEMAP_PATHS, SPECIALTY_HTML_DIR, sitemapXml, specialtyHtml } from "./specialty-pages.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 300));
  }
};

/** Lo que nunca va en una página pública de venta (constitución, principio III). */
const FORBIDDEN: [RegExp, string][] = [
  [/LOPDP|protección de datos personales/i, "la LOPDP"],
  [/\$\s?\d|\d\s?(USD|dólares)/i, "un precio"],
  [/\d\s?%/, "un porcentaje"],
  [/testimoni|nuestros clientes dicen|opiniones de/i, "un testimonio"],
  [/sincroniz/i, "la sincronización con Google"],
  [/suscripci[oó]n|iPad|App Store/i, "la suscripción de iPhone/iPad"],
];

console.log("Los textos");
for (const specialty of SPECIALTIES) {
  const texts = JSON.stringify(specialty);
  const found = FORBIDDEN.filter(([pattern]) => pattern.test(texts)).map(([, what]) => what);
  ok(found.length === 0, `${specialty.name}: sin LOPDP, precios, porcentajes, testimonios ni funciones paradas`, found);
  ok(
    specialty.meta.title.length <= 70 && specialty.meta.description.length >= 50 && specialty.meta.description.length <= 160,
    `${specialty.name}: título (≤ 70) y descripción (50 a 160) para Google y para compartir`,
    [specialty.meta.title.length, specialty.meta.description.length],
  );
  ok(
    specialty.blocks.length === 6 && specialty.steps.length === 3 && specialty.questions.length >= 4,
    `${specialty.name}: 6 casillas, 3 pasos y al menos 4 preguntas`,
    [specialty.blocks.length, specialty.steps.length, specialty.questions.length],
  );
  ok(/Agenda360/.test(specialty.whatsappMessage), `${specialty.name}: el mensaje de WhatsApp`, specialty.whatsappMessage);
}
ok(new Set(SPECIALTIES.map((specialty) => specialty.slug)).size === SPECIALTIES.length, "cada especialidad con su dirección");

console.log("Lo que se publica");
const indexHtml = readFileSync(path.join(ROOT, "index.html"), "utf8");
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf8")) as { rewrites: { source: string; destination: string }[] };
const router = readFileSync(path.join(ROOT, "src/app/router.tsx"), "utf8");
const catchAll = vercel.rewrites.findIndex((rewrite) => rewrite.destination === "/index.html");
for (const specialty of SPECIALTIES) {
  const html = specialtyHtml(indexHtml, specialty, "https://ejemplo.test");
  ok(
    html.includes(`<title>${specialty.meta.title}</title>`) &&
      html.includes(`property="og:url" content="https://ejemplo.test/${specialty.slug}"`) &&
      html.includes('property="og:title"') &&
      html.includes('property="og:description"') &&
      (html.match(/name="description"/g) ?? []).length === 1,
    `${specialty.name}: su HTML con su título, su descripción y las etiquetas para compartir`,
  );
  const rule = vercel.rewrites.findIndex(
    (rewrite) => rewrite.source === `/${specialty.slug}` && rewrite.destination === `/${SPECIALTY_HTML_DIR}/${specialty.slug}.html`,
  );
  ok(rule >= 0 && rule < catchAll, `${specialty.name}: vercel.json la sirve con su HTML, antes de la regla general`, { rule, catchAll });
  ok(router.includes(`"/${specialty.slug}"`), `${specialty.name}: su ruta en el router`);
}
const sitemap = sitemapXml("https://ejemplo.test");
ok(
  SPECIALTIES.every((specialty) => sitemap.includes(`https://ejemplo.test/${specialty.slug}<`)) && sitemap.includes("https://ejemplo.test/privacidad<"),
  "el mapa del sitio tiene las páginas por especialidad y /privacidad",
);
ok(!SITEMAP_PATHS.some((page) => /^\/(pago|cita|dashboard|admin|book)/.test(page)), "y ninguna página privada", SITEMAP_PATHS);

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: las páginas por especialidad cumplen las reglas de la portada y se publican con lo suyo.");
