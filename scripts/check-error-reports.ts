/**
 * Los avisos de errores de la web (spec 044): `npm run check:error-reports`.
 *
 * - errorPagePath y errorApiPath: la página y las rutas de la API sin identificadores, tokens, emails, números
 *   largos, parámetros ni el nombre del negocio de su página de reservas.
 * - anonymizePath: la limpieza de la analítica sigue igual.
 * - scrubMessage: el mensaje sin emails, teléfonos, cédulas ni tokens.
 * - shouldReport: no se avisan los errores de la API, la versión vieja, la falta de conexión, una petición
 *   cortada ni los de las extensiones del navegador.
 * - userTypeFor e isReportingEnabled.
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

const { anonymizePath } = await import("../src/lib/anonymize-url.ts");
const { errorApiPath, errorPagePath, scrubMessage, userTypeFor } = await import("../src/lib/error-report-rules.ts");
const { isReportingEnabled, shouldReport } = await import("../src/lib/error-reports.ts");
const { DataError } = await import("../src/lib/data/errors.ts");

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};
const same = (actual: unknown, expected: unknown, label: string) => ok(actual === expected, label, { actual, expected });

const ID = "0b6e1c2a-5f3d-4c8e-9a1b-2c3d4e5f6a7b";
const HEX = "9f3c2b1a0d9e8f7a6b5c4d3e2f1a0b9c";

console.log("\nLa página, para Sentry");
same(errorPagePath(`/dashboard/clients/${ID}?tab=historia#notas`), "/dashboard/clients/[id]", "un paciente del panel: sin su id ni los parámetros");
same(errorPagePath("/book/psicovalle"), "/book/[negocio]", "la página de reservas: sin el nombre del negocio");
same(errorPagePath("/book/mente-abierta/confirmacion"), "/book/[negocio]/confirmacion", "y lo que sigue, igual");
same(errorPagePath("/cita/Xk9_aB3-qwerty"), "/cita/[token]", "«Tu cita»: sin su token, aunque sea corto");
same(errorPagePath(`/pago/${HEX}`), "/pago/[token]", "el pago: sin su token");
same(errorPagePath(`/admin/businesses/${ID}`), "/admin/businesses/[id]", "un negocio de /admin");
same(errorPagePath("/dashboard/agenda"), "/dashboard/agenda", "una página sin datos queda igual");
same(errorPagePath("/"), "/", "la portada");

console.log("\nLas rutas de la API, para las migas");
same(errorApiPath(`/businesses/${ID}/clients?q=Juan%20P%C3%A9rez`), "/businesses/[id]/clients", "sin el id ni la búsqueda");
same(errorApiPath("/public/businesses/mente-abierta/clients/lookup"), "/public/businesses/[negocio]/clients/lookup", "la reserva: sin el nombre del negocio");
same(errorApiPath(`/public/appointments/AbCdEf123456_x/confirm`), "/public/appointments/[token]/confirm", "«Tu cita»: sin el token");
same(errorApiPath(`/public/payments/${HEX}/receipts`), "/public/payments/[token]/receipts", "el pago: sin el token");
same(errorApiPath("/public/referrals/PSICO24"), "/public/referrals/[código]", "la recomendación: sin el código");
same(errorApiPath("/auth/check/ana.perez%40correo.com"), "/auth/check/[email]", "un email en la ruta");
same(errorApiPath("/clients/lookup/0991234567"), "/clients/lookup/[número]", "un teléfono o una cédula en la ruta");
same(errorApiPath("/auth/session"), "/auth/session", "una ruta sin datos queda igual");

console.log("\nLa analítica sigue igual");
same(anonymizePath(`/dashboard/clients/${ID}`), "/dashboard/clients/[id]", "el id");
same(anonymizePath(`/pago/${HEX}`), "/pago/[token]", "el token del pago");

console.log("\nEl mensaje");
const message = scrubMessage("No se pudo enviar a ana.perez@correo.com, tel. 0991234567 o +593 99 123 4567, cédula 1712345678");
ok(!/ana|correo|099|593|1712/.test(message) && message.includes("[email]") && message.includes("[número]"), "emails, teléfonos y cédulas tapados", message);
same(scrubMessage(`token ${HEX}abcdef`), "token [token]", "un token largo tapado");
same(scrubMessage("Cannot read properties of undefined (reading 'name')"), "Cannot read properties of undefined (reading 'name')", "un mensaje sin datos queda igual");
same(scrubMessage("x".repeat(500)).length, 300, "hasta 300 caracteres");

console.log("\nQué se avisa");
ok(!shouldReport(new DataError("network", "No se pudo conectar")), "la falta de conexión con la API, no");
ok(!shouldReport(new DataError("validation", "Datos no válidos")), "un error previsto de la API, no");
ok(!shouldReport(new DataError("server", "Ocurrió un error inesperado")), "un 500 de la API, no: lo avisa la API");
ok(!shouldReport(new TypeError("Failed to fetch dynamically imported module: https://x/assets/a.js")), "la versión vieja, no");
ok(!shouldReport(new TypeError("Failed to fetch")) && !shouldReport(new TypeError("Load failed")), "un pedido sin conexión, no");
ok(!shouldReport(Object.assign(new Error("The operation was aborted."), { name: "AbortError" })), "un pedido cortado, no");
const fromExtension = new Error("boom");
fromExtension.stack = "Error: boom\n    at x (chrome-extension://abcdef/content.js:1:2)";
ok(!shouldReport(fromExtension), "un error de una extensión del navegador, no");
ok(!shouldReport(new Error("ResizeObserver loop completed with undelivered notifications.")), "el aviso del ResizeObserver, no");
ok(shouldReport(new TypeError("Cannot read properties of undefined (reading 'map')")), "un error de la app, sí");
ok(shouldReport("algo falló") && !shouldReport(undefined) && !shouldReport(null) && !shouldReport(""), "un texto sí; nada, no");

console.log("\nQuién lo vio");
same(userTypeFor("/book/psicovalle", { superAdmin: true, signedIn: true }), "paciente", "en la página de reservas: paciente, aunque haya sesión");
same(userTypeFor("/cita/abc", { superAdmin: false, signedIn: false }), "paciente", "en «Tu cita»: paciente");
same(userTypeFor("/pago/abc", { superAdmin: false, signedIn: false }), "paciente", "en el pago: paciente");
same(userTypeFor("/admin", { superAdmin: true, signedIn: true }), "super admin", "el super admin");
same(userTypeFor("/dashboard", { superAdmin: false, signedIn: true }), "equipo", "el equipo de un negocio");
same(userTypeFor("/", { superAdmin: false, signedIn: false }), "visitante", "alguien sin sesión");

console.log("\nCuándo se envía");
const DSN = "https://clave@o1.ingest.us.sentry.io/1";
ok(!isReportingEnabled(undefined, "agenda-3-6-0.vercel.app"), "sin DSN, nunca");
ok(isReportingEnabled(DSN, "agenda-3-6-0.vercel.app"), "con DSN, en la web publicada");
ok(!isReportingEnabled(DSN, "localhost"), "con el DSN real, no desde este equipo");
ok(isReportingEnabled("http://prueba@127.0.0.1:9999/1", "localhost"), "con un Sentry de prueba de este equipo, sí (el recorrido)");
ok(!isReportingEnabled("no-es-un-dsn", "agenda-3-6-0.vercel.app"), "un DSN mal escrito, no");

ok(false, "prueba roja a propósito (spec 045): este PR se cierra sin fusionar");

if (failures) {
  console.log(`\n${failures} comprobación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodo bien");
