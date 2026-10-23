/**
 * El tablero de las citas (spec 034): `npm run check:board`.
 *
 * - boardColumnOf: cada estado y cada pago caen en su columna (las pendientes y las confirmadas pagadas
 *   siguen en la suya, con la marca «Pagada»).
 * - boardMove: los movimientos permitidos hacen lo de la cita (confirmar, completar, marcar o quitar el
 *   pago) y los prohibidos vuelven con su motivo: nada a «Por confirmar», una atendida no vuelve a
 *   «Confirmadas», a la columna plegada no se lleva nada y de ella no sale nada.
 * - boardTargets: el menú «Mover a…» sólo ofrece los permitidos, sin repetir lo que hace lo mismo.
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

const { BOARD_COLUMNS, BOARD_MOVE_ERRORS, boardColumnOf, boardMove, boardTargets } = await import(
  "../src/features/calendar/board-columns.ts"
);
type AppointmentStatus = import("../src/types/index.ts").AppointmentStatus;
type BoardColumn = import("../src/features/calendar/board-columns.ts").BoardColumn;

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const PAID = "2026-10-22T15:00:00.000Z";
const at = (status: AppointmentStatus, paid = false) => ({ status, paidAt: paid ? PAID : null });
const COLUMNS = BOARD_COLUMNS.map((column) => column.id);

console.log("boardColumnOf: la columna de cada cita");
ok(same(COLUMNS, ["pending", "confirmed", "completed", "paid", "closed"]), "cinco columnas, en el orden del recorrido y la plegada al final", COLUMNS);
ok(
  same(
    BOARD_COLUMNS.map((column) => column.title),
    ["Por confirmar", "Confirmadas", "Atendidas", "Pagadas", "No asistió / Canceladas"],
  ),
  "con los títulos de la spec",
);
const placed: [ReturnType<typeof at>, BoardColumn][] = [
  [at("pending"), "pending"],
  [at("pending", true), "pending"],
  [at("confirmed"), "confirmed"],
  [at("confirmed", true), "confirmed"],
  [at("completed"), "completed"],
  [at("completed", true), "paid"],
  [at("cancelled"), "closed"],
  [at("cancelled", true), "closed"],
  [at("no_show"), "closed"],
  [at("no_show", true), "closed"],
];
for (const [appointment, column] of placed) {
  ok(boardColumnOf(appointment) === column, `${appointment.status}${appointment.paidAt ? " y pagada" : ""} → ${column}`, boardColumnOf(appointment));
}

console.log("boardMove: los movimientos permitidos");
const allowed: [ReturnType<typeof at>, BoardColumn, { status: string | null; paid: boolean | null }, BoardColumn][] = [
  [at("pending"), "confirmed", { status: "confirmed", paid: null }, "confirmed"],
  [at("pending"), "completed", { status: "completed", paid: null }, "completed"],
  [at("pending"), "paid", { status: "completed", paid: true }, "paid"],
  [at("confirmed"), "completed", { status: "completed", paid: null }, "completed"],
  [at("confirmed"), "paid", { status: "completed", paid: true }, "paid"],
  // Pagada antes de atenderla: al completarla queda en «Pagadas» y el pago no se vuelve a marcar.
  [at("confirmed", true), "completed", { status: "completed", paid: null }, "paid"],
  [at("confirmed", true), "paid", { status: "completed", paid: null }, "paid"],
  [at("pending", true), "confirmed", { status: "confirmed", paid: null }, "confirmed"],
  [at("completed"), "paid", { status: null, paid: true }, "paid"],
  [at("completed", true), "completed", { status: null, paid: false }, "completed"],
];
for (const [appointment, to, action, lands] of allowed) {
  const move = boardMove(appointment, to);
  ok(
    move?.allowed && same(move.action, action) && move.lands === lands,
    `${boardColumnOf(appointment)}${appointment.paidAt ? " (pagada)" : ""} → ${to}: ${action.status ? `estado ${action.status}` : "sin cambiar el estado"}${action.paid === null ? "" : action.paid ? ", marca el pago" : ", quita el pago"}; queda en ${lands}`,
    move,
  );
}
ok(boardMove(at("confirmed"), "confirmed") === null && boardMove(at("completed", true), "paid") === null, "a su propia columna, nada");

console.log("boardMove: los prohibidos vuelven con su motivo");
const reasonOf = (appointment: ReturnType<typeof at>, to: BoardColumn) => {
  const move = boardMove(appointment, to);
  return move && !move.allowed ? move.reason : null;
};
for (const status of ["confirmed", "completed"] as const) {
  for (const paid of [false, true]) {
    ok(reasonOf(at(status, paid), "pending") === BOARD_MOVE_ERRORS.toPending, `${status}${paid ? " y pagada" : ""} → Por confirmar: no`);
  }
}
ok(reasonOf(at("completed"), "confirmed") === BOARD_MOVE_ERRORS.locked, "Atendidas → Confirmadas: no (para eso, «Corregir estado»)");
ok(reasonOf(at("completed", true), "confirmed") === BOARD_MOVE_ERRORS.locked, "Pagadas → Confirmadas: no");
ok(reasonOf(at("confirmed"), "pending") === BOARD_MOVE_ERRORS.toPending, "Confirmadas → Por confirmar: no");
for (const from of [at("pending"), at("confirmed"), at("completed"), at("completed", true)]) {
  ok(reasonOf(from, "closed") === BOARD_MOVE_ERRORS.toClosed, `${boardColumnOf(from)} → la plegada: no (se cancela desde la cita)`);
}
for (const from of [at("cancelled"), at("no_show"), at("no_show", true)]) {
  for (const to of ["pending", "confirmed", "completed", "paid"] as const) {
    ok(reasonOf(from, to) === BOARD_MOVE_ERRORS.fromClosed, `${from.status}${from.paidAt ? " (pagada)" : ""} → ${to}: no, sólo se consulta`);
  }
}
ok(
  Object.values(BOARD_MOVE_ERRORS).every((reason) => reason.length > 20 && reason.endsWith(".")),
  "cada motivo es una frase que se entiende sola",
);

console.log("boardTargets: el menú «Mover a…»");
const menu = (appointment: ReturnType<typeof at>) => boardTargets(appointment).map((target) => target.column);
ok(same(menu(at("pending")), ["confirmed", "completed", "paid"]), "Por confirmar: Confirmadas, Atendidas y Pagadas", menu(at("pending")));
ok(same(menu(at("confirmed")), ["completed", "paid"]), "Confirmadas: Atendidas y Pagadas", menu(at("confirmed")));
ok(same(menu(at("confirmed", true)), ["paid"]), "Confirmada y pagada: sólo Pagadas (Atendidas haría lo mismo)", menu(at("confirmed", true)));
ok(same(menu(at("completed")), ["paid"]), "Atendidas: Pagadas", menu(at("completed")));
ok(same(menu(at("completed", true)), ["completed"]), "Pagadas: Atendidas (quita el pago)", menu(at("completed", true)));
ok(menu(at("cancelled")).length === 0 && menu(at("no_show")).length === 0, "la plegada: ninguno");
ok(
  [at("pending"), at("confirmed"), at("completed"), at("completed", true)].every((appointment) => !menu(appointment).includes("pending")),
  "ninguno ofrece «Por confirmar»",
);

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: cada cita cae en su columna y el tablero sólo hace los movimientos de la cita.");
