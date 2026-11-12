/**
 * «Por cobrar» (spec 046): `npm run check:pending-payments`.
 *
 * - isPendingPayment: sólo las Completadas, con precio, sin pagar y desde PENDING_PAYMENTS_SINCE.
 * - pendingPaymentsOf y pendingTotal: las del paciente como principal, de la más antigua a la más reciente.
 * - Reportes (summarize): «Por cobrar» es parte de «Ingresos de citas atendidas», que sigue contando las pagadas.
 * - buildPendingPaymentsMessage: las sesiones, el total y las cuentas sin repetir; nunca «deuda».
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

const { PENDING_PAYMENTS_SINCE } = await import("../src/lib/constants/business.ts");
const { isPendingPayment, pendingPaymentsOf, pendingTotal } = await import("../src/lib/pending-payments.ts");
const { summarize } = await import("../src/features/reports/report-stats.ts");
const { buildPendingPaymentsMessage } = await import("../src/lib/whatsapp.ts");
const { addDaysISO } = await import("../src/lib/time.ts");
type Appointment = import("../src/types/index.ts").Appointment;
type BankAccount = import("../src/types/index.ts").BankAccount;

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};

const PAID = "2026-11-20T15:00:00.000Z";
const day = (offset: number) => addDaysISO(PENDING_PAYMENTS_SINCE, offset);
let seq = 0;
const session = (patch: Partial<Appointment> = {}): Appointment =>
  ({
    id: `cita-${++seq}`,
    clientId: "ana",
    status: "completed",
    price: 25,
    paidAt: null,
    receiptAt: null,
    date: day(3),
    startTime: "10:00",
    endTime: "10:45",
    ...patch,
  }) as Appointment;

console.log("isPendingPayment: qué cuenta");
ok(isPendingPayment(session()), "una Completada, con precio y sin pagar");
ok(isPendingPayment(session({ date: day(0) })), "el mismo día en que empieza a contar");
ok(!isPendingPayment(session({ date: day(-1) })), "no la del día anterior a la fecha de inicio");
ok(!isPendingPayment(session({ paidAt: PAID })), "no la pagada");
ok(!isPendingPayment(session({ price: 0 })), "no la gratis");
ok(
  (["pending", "confirmed", "cancelled", "no_show"] as const).every((status) => !isPendingPayment(session({ status }))),
  "no las pendientes, confirmadas, canceladas ni «No asistió»",
);
ok(isPendingPayment(session({ receiptAt: PAID })), "la que tiene comprobante sin marcar como pagada sí cuenta (por revisar)");

console.log("\npendingPaymentsOf y pendingTotal: las del paciente");
const late = session({ date: day(5), price: 30 });
const early = session({ date: day(2), startTime: "16:00", price: 20 });
const earlier = session({ date: day(2), startTime: "09:00", price: 25 });
const other = session({ clientId: "bruno" });
const paid = session({ paidAt: PAID });
const list = pendingPaymentsOf([late, other, early, paid, earlier], "ana");
ok(
  JSON.stringify(list.map((a) => a.id)) === JSON.stringify([earlier.id, early.id, late.id]),
  "sólo las suyas por cobrar, de la más antigua a la más reciente",
  list.map((a) => a.id),
);
ok(pendingTotal(list) === 75, "el total: $75", pendingTotal(list));

console.log("\nReportes: «Por cobrar» es parte de los ingresos de las atendidas");
const summary = summarize([late, early, paid, session({ status: "confirmed", price: 40 }), session({ date: day(-1), price: 50 })]);
ok(summary.pendingRevenue === 50, "por cobrar: las dos sin pagar desde la fecha de inicio", summary.pendingRevenue);
ok(summary.completedRevenue === 125, "ingresos de citas atendidas: las completadas, pagadas o no", summary.completedRevenue);
ok(summary.pendingRevenue <= summary.completedRevenue, "nunca más que los ingresos de las atendidas");

console.log("\nbuildPendingPaymentsMessage: el WhatsApp");
const account: BankAccount = { bank: "Banco del Ejemplo", accountType: "savings", number: "2200123456", holder: "Consultorio Demo", holderId: "" };
const message = buildPendingPaymentsMessage({
  clientName: "Ana Ejemplo",
  businessName: "Consultorio Demo",
  sessions: [
    { date: day(2), serviceName: "Terapia individual" },
    { date: day(5), serviceName: "Terapia de pareja" },
  ],
  total: 75,
  currency: "USD",
  accounts: [account, { ...account }],
});
ok(message.startsWith("Hola Ana, te escribimos de Consultorio Demo"), "saluda por el nombre y dice de dónde", message.slice(0, 60));
ok(message.includes("tus sesiones") && message.includes("Terapia individual") && message.includes("Terapia de pareja"), "nombra las sesiones");
ok(message.includes("Total: $75"), "lleva el total");
ok(message.split("2200123456").length === 2, "la misma cuenta sale una sola vez");
ok(message.includes("Puedes transferir a esta cuenta"), "una sola cuenta, en singular");
ok(!/deuda|debes|adeud|moros/i.test(message), "nunca «deuda» ni «debes»");
ok(message.includes("Si ya lo pagaste, no te preocupes"), "cierra amable");
const single = buildPendingPaymentsMessage({
  clientName: "",
  businessName: "Consultorio Demo",
  sessions: [{ date: day(2), serviceName: "Consulta" }],
  total: 20,
  accounts: [],
});
ok(single.startsWith("Hola, ") && single.includes("tu sesión:") && !single.includes("transferir"), "sin nombre ni cuentas: «Hola», «tu sesión» y sin cuentas", single);

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: «Por cobrar» cuenta lo que debe, Reportes cuadra y el WhatsApp es un recordatorio amable.");
