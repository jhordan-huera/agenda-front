/**
 * La pantalla Actividad del super admin (spec 049): `npm run check:admin-activity`.
 *
 * - summarizeToday: el resumen de hoy, con y sin fallidos o cuentas en alerta, en singular y plural.
 * - tabBadges: la cifra de Seguridad y la de Emails.
 * - readActivityUrl y activitySearch: la pestaña y el filtro de cada enlace (?ver=…, ?emails=…).
 * - presetRange, describeRange y ledgerDay: los atajos de fechas, lo que dice el botón y el día de la lista.
 * - emailStatusOf: enviado, en cola, falló y descartado, con su motivo.
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

const { activitySearch, readActivityUrl } = await import("../src/features/admin/activity/activity-url.ts");
const { summarizeToday, tabBadges } = await import("../src/features/admin/activity/today-summary.ts");
const { describeRange, ledgerDay, matchingPreset, presetRange } = await import("../src/features/admin/activity/date-range.ts");
const { emailStatusOf } = await import("../src/features/admin/activity/email-status.ts");

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};

const health = (sent: number, failed: number, queued: number, attempts = 0, alerts = 0) => ({
  emailsToday: { sent, failed, queued },
  security: { failedLogins24h: attempts, accountsOnAlert: alerts },
});
const sentence = (pieces: { text: string }[]) => pieces.map((piece) => piece.text).join("");

console.log("El resumen de hoy");
const calm = summarizeToday(health(46, 0, 3));
ok(calm.tone === "ok" && calm.title === "Todo en orden hoy" && calm.action === null, "sin problemas: «Todo en orden hoy», sin botón", calm);
ok(calm.emails === "Salieron 46 emails y 3 están en cola; ninguno falló.", "la frase de los emails", calm.emails);
ok(
  sentence(calm.security) === "En las últimas 24 horas no hubo intentos fallidos de inicio de sesión y ninguna cuenta está en alerta." &&
    calm.security.every((piece) => !piece.link),
  "sin intentos fallidos, sin enlace",
  calm.security,
);
const one = summarizeToday(health(44, 1, 0, 2));
ok(one.tone === "alert" && one.title === "1 email falló hoy", "1 fallido, en singular", one.title);
ok(
  one.action?.tab === "emails" && one.action.emailFilter === "failed" && one.action.label === "Ver los fallidos",
  "«Ver los fallidos» abre Emails con Fallidos",
  one.action,
);
ok(one.emails === "Salieron 44 emails.", "con fallidos no dice «ninguno falló» y sin cola no la nombra", one.emails);
const link = one.security.find((piece) => piece.link);
ok(
  link?.text === "2 intentos fallidos" && sentence(one.security).startsWith("En las últimas 24 horas hubo 2 intentos fallidos de inicio de sesión"),
  "los intentos fallidos son el enlace",
  one.security,
);
ok(summarizeToday(health(5, 2, 0)).title === "2 emails fallaron hoy", "2 fallidos, en plural");
const locked = summarizeToday(health(10, 0, 0, 12, 1));
ok(locked.tone === "alert" && locked.title === "1 cuenta en alerta", "una cuenta en alerta", locked.title);
ok(
  locked.action?.tab === "security" && locked.action.onlyFailed === true && locked.action.label === "Ver la seguridad",
  "«Ver la seguridad» con sólo los intentos fallidos",
  locked.action,
);
ok(sentence(locked.security).endsWith("; 1 cuenta está en alerta."), "la frase nombra la cuenta en alerta", sentence(locked.security));
const both = summarizeToday(health(10, 3, 1, 20, 2));
ok(
  both.title === "3 emails fallaron hoy y 2 cuentas en alerta" && both.action?.tab === "emails",
  "las dos cosas: el título las junta y el botón va a los emails",
  both,
);
ok(summarizeToday(health(1, 0, 1)).emails === "Salió 1 email y 1 está en cola; ninguno falló.", "en singular", summarizeToday(health(1, 0, 1)).emails);
ok(summarizeToday(health(0, 0, 0)).emails === "Todavía no salió ningún email.", "sin emails todavía", summarizeToday(health(0, 0, 0)).emails);
ok(summarizeToday(health(0, 0, 4)).emails === "Todavía no salió ningún email y 4 están en cola.", "sólo en cola", summarizeToday(health(0, 0, 4)).emails);
ok(summarizeToday(health(1200, 0, 0)).emails === "Salieron 1.200 emails; ninguno falló.", "con el punto de los miles", summarizeToday(health(1200, 0, 0)).emails);

console.log("\nLas cifras de las pestañas");
const quiet = tabBadges(health(46, 0, 0));
ok(quiet.security === null && quiet.emails === null, "sin nada que mirar, sin cifras", quiet);
const badges = tabBadges(health(46, 2, 3, 5));
ok(badges.emails?.label === "2 fallidos" && badges.emails.tone === "alert", "Emails: los fallidos primero, en rojo", badges.emails);
ok(
  badges.security?.label === "5" && badges.security.tone === "ok" && badges.security.srLabel === "5 intentos fallidos en las últimas 24 horas",
  "Seguridad: los intentos fallidos",
  badges.security,
);
const queued = tabBadges(health(46, 0, 3));
ok(queued.emails?.label === "3 en cola" && queued.emails.tone === "ok", "sin fallidos, los que están en cola", queued.emails);
ok(tabBadges(health(1, 0, 0, 30, 1)).security?.tone === "alert", "con una cuenta en alerta, Seguridad en rojo");

console.log("\nLa dirección");
const read = (search: string) => readActivityUrl(new URLSearchParams(search));
ok(read("ver=seguridad").tab === "security", "?ver=seguridad (los avisos de seguridad) abre Seguridad");
ok(read("emails=hoy").tab === "emails" && read("emails=hoy").emailFilter === "today", "?emails=hoy abre Emails con Hoy");
ok(read("emails=fallidos").emailFilter === "failed" && read("emails=todos").emailFilter === "all", "?emails=fallidos y ?emails=todos");
ok(read("ver=emails").tab === "emails" && read("ver=emails").emailFilter === null, "?ver=emails abre Emails con el filtro de siempre");
ok(read("ver=acciones").tab === "actions", "?ver=acciones");
ok(read("").tab === null && read("ver=otra").tab === null && read("emails=constructor").tab === null, "sin nada o con algo desconocido, la de siempre");
ok(activitySearch("security") === "?ver=seguridad" && activitySearch("actions") === "?ver=acciones", "la dirección de cada pestaña");
ok(activitySearch("emails", "failed") === "?ver=emails&emails=fallidos", "Emails lleva su filtro", activitySearch("emails", "failed"));
ok(read(activitySearch("emails", "today").slice(1)).emailFilter === "today", "ida y vuelta");

console.log("\nLas fechas");
const today = "2026-11-13";
ok(JSON.stringify(presetRange("today", today)) === JSON.stringify({ from: today, to: today }), "Hoy");
ok(
  presetRange("last7", today).from === "2026-11-07" && presetRange("last30", today).from === "2026-10-15",
  "7 y 30 días, contando hoy",
  [presetRange("last7", today), presetRange("last30", today)],
);
ok(describeRange({ from: "", to: "" }, today) === "Cualquier fecha", "sin fechas: «Cualquier fecha»");
ok(describeRange(presetRange("last7", today), today) === "Últimos 7 días" && matchingPreset(presetRange("last30", today), today) === "last30", "un atajo se nombra");
ok(describeRange({ from: "2026-11-03", to: "2026-11-12" }, today) === "3 nov – 12 nov", "un rango del año", describeRange({ from: "2026-11-03", to: "2026-11-12" }, today));
ok(
  describeRange({ from: "2025-12-20", to: "2026-01-05" }, today) === "20 dic 2025 – 5 ene 2026",
  "con el año si alguna punta no es de este año",
  describeRange({ from: "2025-12-20", to: "2026-01-05" }, today),
);
ok(describeRange({ from: "2026-11-03", to: "" }, today) === "Desde 3 nov" && describeRange({ from: "", to: "2026-11-12" }, today) === "Hasta 12 nov", "sólo desde o sólo hasta");
ok(describeRange({ from: "2026-11-10", to: "2026-11-10" }, today) === "10 nov", "un solo día");

console.log("\nEl día de la lista");
const day = (date: string) => ledgerDay(date, today);
ok(JSON.stringify(day("2026-11-13")) === JSON.stringify({ title: "Hoy", subtitle: "viernes 13 nov" }), "hoy", day("2026-11-13"));
ok(JSON.stringify(day("2026-11-12")) === JSON.stringify({ title: "Ayer", subtitle: "jueves 12 nov" }), "ayer", day("2026-11-12"));
ok(JSON.stringify(day("2026-11-08")) === JSON.stringify({ title: "Domingo", subtitle: "8 nov" }), "otro día del año", day("2026-11-08"));
ok(day("2025-08-29").subtitle === "29 ago 2025", "con el año si no es este", day("2025-08-29"));

console.log("\nEl estado de cada email");
ok(JSON.stringify(emailStatusOf({ status: "sent", error: null })) === JSON.stringify({ key: "sent", label: "Enviado", detail: null }), "enviado, sin motivo");
ok(emailStatusOf({ status: "queued", error: null }).label === "En cola", "en cola");
const failed = emailStatusOf({ status: "failed", error: "La dirección no existe", discarded: false });
ok(failed.key === "failed" && failed.label === "Falló" && failed.detail === "La dirección no existe", "falló, con el motivo", failed);
ok(emailStatusOf({ status: "failed", error: "  " }).detail === "Sin motivo registrado.", "falló sin motivo guardado");
const discarded = emailStatusOf({ status: "failed", error: "Recordatorio descartado: la cita ya empezó.", discarded: true });
ok(
  discarded.key === "discarded" && discarded.label === "Descartado" && discarded.detail === "Recordatorio descartado: la cita ya empezó.",
  "descartado, con su motivo",
  discarded,
);

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: el resumen, las cifras de las pestañas, la dirección, las fechas, el día de la lista y el estado de los emails.");
