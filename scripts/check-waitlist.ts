/**
 * Lista de espera (spec 047): `npm run check:waitlist`.
 *
 * - readWaitlistOffer: el enlace «Reservar esta hora» sólo se usa completo y con su formato.
 * - Las partes del día de cada hora y los textos de los días y los horarios.
 * - El WhatsApp para ofrecer una hora.
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

const { readWaitlistOffer } = await import("../src/features/booking/waitlist-offer.ts");
const { dayPartOf, describeDayParts, describeWaitlistDays } = await import("../src/lib/constants/business.ts");
const { buildWaitlistWhatsAppMessage } = await import("../src/lib/whatsapp.ts");

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};

const SERVICE = "83415b0d-1232-4507-bf2f-0ab929ea6bf1";
const AGENDA = "2cb67c49-1fb5-491b-a5a9-a15e1ee2c1a0";
const TOKEN = "0123456789abcdef0123456789abcdef";
const link = (patch: Record<string, string> = {}) =>
  new URLSearchParams({ servicio: SERVICE, profesional: AGENDA, fecha: "2026-12-07", hora: "09:30", espera: TOKEN, ...patch });

console.log("readWaitlistOffer: el enlace «Reservar esta hora»");
ok(
  JSON.stringify(readWaitlistOffer(link())) ===
    JSON.stringify({ serviceId: SERVICE, professionalId: AGENDA, date: "2026-12-07", time: "09:30", token: TOKEN }),
  "completo: el servicio, el profesional, la fecha, la hora y el enlace",
);
ok(readWaitlistOffer(new URLSearchParams()) === null, "sin parámetros: nada");
ok(readWaitlistOffer(link({ hora: "25:00" })) === null, "una hora imposible: nada");
ok(readWaitlistOffer(link({ fecha: "7/12/2026" })) === null, "otra forma de fecha: nada");
ok(readWaitlistOffer(link({ espera: "abc" })) === null, "un enlace de espera corto: nada");
ok(readWaitlistOffer(link({ servicio: "limpieza" })) === null, "un servicio que no es un id: nada");

console.log("\nLas partes del día y los textos");
ok(dayPartOf("08:00") === "morning" && dayPartOf("11:59") === "morning", "antes de las 12, mañana");
ok(dayPartOf("12:00") === "afternoon" && dayPartOf("17:59") === "afternoon", "de 12 a 18, tarde");
ok(dayPartOf("18:00") === "evening" && dayPartOf("21:30") === "evening", "desde las 18, noche");
ok(describeWaitlistDays([1, 3, 5]) === "Lunes, miércoles y viernes", "tres días", describeWaitlistDays([1, 3, 5]));
ok(describeWaitlistDays([5, 1, 2, 3, 4]) === "De lunes a viernes", "de lunes a viernes", describeWaitlistDays([5, 1, 2, 3, 4]));
ok(describeWaitlistDays([0, 1, 2, 3, 4, 5, 6]) === "Todos los días", "todos los días");
ok(describeWaitlistDays([6]) === "Sábado", "un día", describeWaitlistDays([6]));
ok(describeDayParts(["evening", "morning"]) === "Mañana o noche", "dos partes, en orden", describeDayParts(["evening", "morning"]));
ok(describeDayParts(["morning", "afternoon", "evening"]) === "Mañana, tarde o noche", "las tres");

console.log("\nEl WhatsApp para ofrecer una hora");
const message = buildWaitlistWhatsAppMessage({ name: "Ana Ejemplo", businessName: "Consultorio Demo", serviceName: "Terapia individual" });
ok(message.startsWith("Hola Ana, te escribimos de Consultorio Demo"), "saluda por el nombre y dice de dónde", message);
ok(message.includes("lista de espera de Terapia individual") && message.endsWith(": "), "nombra el servicio y deja escribir la hora");
ok(buildWaitlistWhatsAppMessage({ name: " ", businessName: "X", serviceName: "Y" }).startsWith("Hola, "), "sin nombre: «Hola»");

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: el enlace de la lista de espera, las partes del día y el WhatsApp.");
