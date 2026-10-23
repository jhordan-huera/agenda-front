/**
 * El calendario de la plataforma (spec 035): `npm run check:admin-calendar`.
 *
 * - intensityLevel: sin citas, sin fondo; con citas, del 1 al 4 frente al día (o la hora) con más, y el
 *   que más tiene siempre en el 4.
 * - INTENSITY_CLASS: el fondo de cada nivel mezcla la marca con la tarjeta, cada vez más, y el nivel 0 no
 *   lleva fondo.
 * - visibleHours: de las 7 a las 20 como mínimo, ampliadas a las horas con citas.
 * - totalsOf: suma sólo los días que se le piden (el mes, sin los días de los meses de al lado).
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


const { INTENSITY_CLASS, intensityLevel, totalsOf, visibleHours, hourLabel } = await import("../src/features/admin/calendar/calendar-figures.ts");

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log("intensityLevel: el fondo de cada día");
ok(intensityLevel(0, 10) === 0, "sin citas: nivel 0");
ok(intensityLevel(5, 0) === 0, "sin máximo (todo vacío): nivel 0");
ok(intensityLevel(1, 100) === 1, "una cita frente a 100: nivel 1, nunca sin fondo");
ok(same([1, 2, 3, 4, 5, 6, 7, 8].map((count) => intensityLevel(count, 8)), [1, 1, 2, 2, 3, 3, 4, 4]), "de 1 a 8 frente a 8: sube en cuatro escalones");
ok(intensityLevel(8, 8) === 4 && intensityLevel(1, 1) === 4, "el que más tiene: nivel 4");
ok(intensityLevel(12, 8) === 4, "nunca pasa del 4");

console.log("INTENSITY_CLASS: la marca mezclada con la tarjeta");
const percents = ([1, 2, 3, 4] as const).map((level) => Number(/var\(--primary\)_(\d+)%,var\(--card\)/.exec(INTENSITY_CLASS[level])?.[1]));
ok(INTENSITY_CLASS[0] === "", "el nivel 0 no lleva fondo");
ok(percents.every((percent, index) => percent > 0 && (index === 0 || percent > percents[index - 1])), "cada nivel, más intenso que el anterior", percents);
ok(percents[3] <= 32, "el más intenso, como mucho al 32 %: el número se sigue leyendo encima", percents);

console.log("visibleHours: las horas de la semana");
ok(same(visibleHours([]), [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]), "sin citas: de 07:00 a 20:00");
ok(visibleHours([{ hour: 6 }, { hour: 21 }])[0] === 6 && visibleHours([{ hour: 6 }, { hour: 21 }]).at(-1) === 21, "con citas a las 06:00 y a las 21:00: se amplía");
ok(visibleHours([{ hour: 10 }]).length === 14, "con citas dentro del horario: no cambia");
ok(hourLabel(7) === "07:00" && hourLabel(14) === "14:00", "las horas con dos cifras");

console.log("totalsOf: el total del mes");
const days = [
  { date: "2026-09-30", appointments: 4, cancelled: 0, unclosed: 1, businesses: 1 },
  { date: "2026-10-01", appointments: 6, cancelled: 2, unclosed: 2, businesses: 2 },
  { date: "2026-10-15", appointments: 3, cancelled: 0, unclosed: 0, businesses: 1 },
];
ok(same(totalsOf(days, (date) => date.startsWith("2026-10")), { appointments: 9, unclosed: 2 }), "octubre: sin el 30 de septiembre que se ve en la cuadrícula");
ok(same(totalsOf([], () => true), { appointments: 0, unclosed: 0 }), "sin días: cero");

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: el fondo sube con las citas, la semana muestra sus horas y el total es el del mes.");
