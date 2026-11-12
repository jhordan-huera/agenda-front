/**
 * Encuesta después de la cita (spec 048): `npm run check:surveys`.
 *
 * - starsFromParams: la estrella del enlace del email, sólo de 1 a 5.
 * - formatAverage y ratingBars: el promedio con coma y las barras por estrella de Reportes.
 * - El email: las 5 estrellas con su enlace, «No quiero recibir estas encuestas» y que no se publica.
 *
 * Node ejecuta los .ts directamente; el gancho de abajo resuelve el alias `@/` y los imports sin
 * extensión de src/ como lo hace Vite. Sale con código 1 si algo falla.
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(import.meta.dirname, "../src");
registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL?.startsWith("file:") ? fileURLToPath(context.parentURL) : "";
    const base = specifier.startsWith("@/")
      ? path.join(SRC, specifier.slice(2))
      : specifier.startsWith(".") && parent.startsWith(SRC) && !/\.[cm]?[jt]sx?$/.test(specifier)
        ? path.resolve(path.dirname(parent), specifier)
        : null;
    if (!base) return nextResolve(specifier, context);
    const found = [`${base}.ts`, path.join(base, "index.ts")].find((candidate) => existsSync(candidate));
    if (!found) throw new Error(`${specifier} (desde ${path.relative(SRC, parent)}): no es un .ts de src/.`);
    return nextResolve(pathToFileURL(found).href, context);
  },
});

const { formatAverage, ratingBars, starsFromParams } = await import("../src/lib/surveys.ts");
const { emailTemplates } = await import("../src/lib/email/templates.ts");

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};

console.log("starsFromParams: la estrella del enlace");
ok(starsFromParams(new URLSearchParams("estrellas=4")) === 4, "?estrellas=4 → 4");
ok(starsFromParams(new URLSearchParams("estrellas=1")) === 1 && starsFromParams(new URLSearchParams("estrellas=5")) === 5, "de 1 a 5");
ok(["0", "6", "4.5", "cuatro", ""].every((value) => starsFromParams(new URLSearchParams({ estrellas: value })) === null), "nada fuera de 1 a 5");
ok(starsFromParams(new URLSearchParams()) === null, "sin el parámetro, ninguna");

console.log("\nEl promedio y las barras");
ok(formatAverage(4.5) === "4,5" && formatAverage(3) === "3,0", "con un decimal y coma", [formatAverage(4.5), formatAverage(3)]);
const bars = ratingBars([0, 1, 0, 1, 2]);
ok(JSON.stringify(bars.map((bar) => bar.stars)) === "[5,4,3,2,1]", "de 5 a 1 estrellas");
ok(bars[0].count === 2 && bars[0].percent === 50 && bars[3].percent === 25 && bars[2].percent === 0, "cuántas y qué parte", bars);
ok(ratingBars([0, 0, 0, 0, 0]).every((bar) => bar.percent === 0), "sin respuestas, todo en 0");

console.log("\nEl email de la encuesta");
const email = emailTemplates.surveyRequest({
  clientName: "Ana",
  businessName: "Consultorio Demo",
  businessAddress: "Av. Ejemplo 123",
  businessPhone: "",
  professionalName: "Dra. Pérez",
  serviceName: "Terapia individual",
  date: "2026-11-20",
  surveyUrl: "https://ejemplo.invalid/encuesta/0123456789abcdef0123456789abcdef",
});
ok(email.subject === "¿Cómo te fue en tu cita con Dra. Pérez?", "el asunto nombra al profesional", email.subject);
ok([1, 2, 3, 4, 5].every((stars) => email.html.includes(`?estrellas=${stars}`)), "las 5 estrellas con su enlace");
ok(email.html.includes("?no-recibir=1") && email.body.includes("No quiero recibir estas encuestas"), "con «No quiero recibir estas encuestas»");
ok(email.body.includes("no se publica"), "dice que no se publica");
ok(!email.body.includes("Copia"), "no es una copia al profesional");

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: la estrella del enlace, el promedio, las barras y el email de la encuesta.");
