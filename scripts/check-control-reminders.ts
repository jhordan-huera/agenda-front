/**
 * Recordatorio de control (spec 051): `npm run check:control-reminders`.
 *
 * - describeControlDue y describeClientControl: «Venció hace 2 semanas», «Vence en 5 días», la línea de la ficha.
 * - El mensaje de WhatsApp y el enlace a la página de reservas con el servicio y el profesional.
 * - readServiceLink: `?servicio&profesional` del email; nada con otro formato ni con el enlace de la lista de espera.
 * - «Volver en»: las opciones, su texto y la validación del servicio.
 * - El email: uno o dos servicios, «Reservar mi control» y «No quiero recibir estos recordatorios», sin copia.
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

const { controlBookingUrl, describeClientControl, describeControlDue } = await import("../src/features/control-reminders/control-reminder-text.ts");
const { readServiceLink } = await import("../src/features/booking/service-link.ts");
const { buildControlWhatsAppMessage } = await import("../src/lib/whatsapp.ts");
const { RETURN_AFTER_OPTIONS, describeReturnAfter } = await import("../src/lib/constants/business.ts");
const { serviceSchema } = await import("../src/lib/validations/service.ts");
const { emailTemplates } = await import("../src/lib/email/templates.ts");

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};

const TODAY = "2026-11-15";
console.log("describeControlDue: cuándo le toca");
const due = (dueOn: string) => describeControlDue(dueOn, TODAY);
ok(due("2026-11-15").label === "Vence hoy" && !due("2026-11-15").overdue, "hoy");
ok(due("2026-11-16").label === "Vence mañana" && due("2026-11-14").label === "Venció ayer" && due("2026-11-14").overdue, "mañana y ayer");
ok(due("2026-11-20").label === "Vence en 5 días", "en 5 días", due("2026-11-20"));
ok(due("2026-11-01").label === "Venció hace 2 semanas" && due("2026-11-01").overdue, "hace 2 semanas", due("2026-11-01"));
ok(due("2026-08-15").label === "Venció hace 3 meses", "hace 3 meses", due("2026-08-15"));
ok(due("2025-06-01").label === "Venció hace más de un año", "hace más de un año", due("2025-06-01"));
ok(
  describeClientControl({ serviceName: "Limpieza dental", dueOn: "2026-12-12" }, TODAY) === "Próximo control: Limpieza dental, 12 de diciembre",
  "la ficha: el próximo",
  describeClientControl({ serviceName: "Limpieza dental", dueOn: "2026-12-12" }, TODAY),
);
ok(
  describeClientControl({ serviceName: "Limpieza dental", dueOn: "2026-11-01" }, TODAY) === "Control vencido hace 2 semanas: Limpieza dental",
  "la ficha: el vencido",
  describeClientControl({ serviceName: "Limpieza dental", dueOn: "2026-11-01" }, TODAY),
);

console.log("\nEl WhatsApp y el enlace de reserva");
const SERVICE = "11111111-2222-3333-4444-555555555555";
const AGENDA = "66666666-7777-8888-9999-000000000000";
const url = controlBookingUrl("https://ejemplo.invalid", "clinica-sonrisa", { serviceId: SERVICE, professionalId: AGENDA });
ok(url === `https://ejemplo.invalid/book/clinica-sonrisa?servicio=${SERVICE}&profesional=${AGENDA}`, "la página de reservas con el servicio y el profesional", url);
const message = buildControlWhatsAppMessage({ clientName: "Ana María Pérez", businessName: "Clínica Sonrisa", serviceName: "Limpieza dental", bookingUrl: url });
ok(message.startsWith("Hola Ana, te escribimos de Clínica Sonrisa.") && message.includes("control de Limpieza dental") && message.endsWith(url), "el mensaje, con el nombre de pila y el enlace", message);

console.log("\nreadServiceLink: ?servicio&profesional");
ok(JSON.stringify(readServiceLink(new URLSearchParams(`servicio=${SERVICE}&profesional=${AGENDA}`))) === JSON.stringify({ serviceId: SERVICE, professionalId: AGENDA }), "los dos");
ok(readServiceLink(new URLSearchParams(`servicio=${SERVICE}&profesional=x`))?.professionalId === null, "un profesional con otro formato se ignora");
ok(readServiceLink(new URLSearchParams("servicio=limpieza")) === null && readServiceLink(new URLSearchParams()) === null, "sin servicio válido, nada");
ok(readServiceLink(new URLSearchParams(`servicio=${SERVICE}&espera=0123`)) === null, "el enlace de la lista de espera es otro");

console.log("\n«Volver en»");
ok(RETURN_AFTER_OPTIONS.map((option) => option.days).join(",") === "7,14,30,60,90,180,365", "de 1 semana a 1 año");
ok(describeReturnAfter(180) === "6 meses" && describeReturnAfter(null) === null && describeReturnAfter(45) === null, "su texto");
const base = { name: "Limpieza", description: "", durationMinutes: 30, price: 20, showPrice: true, modes: ["business"], isActive: true };
ok(serviceSchema.safeParse({ ...base, returnAfterDays: 180 }).success && serviceSchema.safeParse({ ...base, returnAfterDays: null }).success, "acepta un tiempo de la lista o No");
ok(!serviceSchema.safeParse({ ...base, returnAfterDays: 45 }).success, "rechaza otro");
ok(serviceSchema.parse(base).returnAfterDays === undefined, "sin el campo (un panel anterior), no se toca");

console.log("\nEl email");
const item = (serviceName: string) => ({
  serviceName,
  professionalName: "Dra. Cruz",
  lastDate: "2026-05-12",
  returnAfter: "6 meses",
  bookUrl: `https://ejemplo.invalid/book/clinica-sonrisa?servicio=${SERVICE}`,
});
const common = {
  clientName: "Ana",
  businessName: "Clínica Sonrisa",
  businessAddress: "Av. Amazonas N34-12",
  businessPhone: "+593 2 222 3333",
  optOutUrl: "https://ejemplo.invalid/recordatorio/0123456789abcdef0123456789abcdef",
};
const one = emailTemplates.controlReminder({ ...common, items: [item("Limpieza dental")] });
ok(one.subject === "Te toca tu control de Limpieza dental", "el asunto", one.subject);
ok(one.body.includes("Hola Ana:") && one.body.includes("Hace 6 meses fue tu cita de Limpieza dental con Dra. Cruz"), "el saludo y hace cuánto", one.body.slice(0, 400));
ok(one.html.includes(item("x").bookUrl.replace(/&/g, "&amp;")) || one.html.includes(item("x").bookUrl), "con «Reservar mi control»");
ok(one.body.includes("Reservar mi control") && one.body.includes("No quiero recibir estos recordatorios") && one.html.includes(common.optOutUrl), "y el enlace para no recibir más");
ok(!one.body.includes("Copia"), "no es una copia al profesional");
const two = emailTemplates.controlReminder({ ...common, items: [item("Limpieza dental"), item("Ortodoncia")] });
ok(two.subject === "Te toca volver a Clínica Sonrisa" && two.body.includes("Reservar Limpieza dental") && two.body.includes("Reservar Ortodoncia"), "dos servicios en un email, un botón por cada uno", two.subject);

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: cuándo le toca, el WhatsApp, el enlace de reserva, «Volver en» y el email del control.");
