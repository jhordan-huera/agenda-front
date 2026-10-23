import { canChangeStatus } from "@/lib/constants/appointment-status";
import type { Appointment, AppointmentStatus } from "@/types";

/*
 * El tablero de las citas (spec 034): en qué columna va cada cita y qué pasa al llevarla a otra. Son
 * funciones puras, sin React, para probarlas con `npm run check:board`. Las reglas son las de la cita
 * (constitución, principio III): una completada queda fija salvo el pago, ninguna vuelve a «Pendiente»,
 * y cancelar o marcar «No asistió» se hace desde la cita.
 */

/** Las columnas del tablero, en su orden: las cuatro del recorrido y la plegada. */
export type BoardColumn = "pending" | "confirmed" | "completed" | "paid" | "closed";

export const BOARD_COLUMNS: { id: BoardColumn; title: string }[] = [
  { id: "pending", title: "Por confirmar" },
  { id: "confirmed", title: "Confirmadas" },
  { id: "completed", title: "Atendidas" },
  { id: "paid", title: "Pagadas" },
  { id: "closed", title: "No asistió / Canceladas" },
];

export const BOARD_COLUMN_TITLES = Object.fromEntries(BOARD_COLUMNS.map(({ id, title }) => [id, title])) as Record<
  BoardColumn,
  string
>;

/**
 * La marca de cada columna, en la gama de la marca como el tablero de la portada (spec 032): lo pendiente con
 * el borde punteado, lo confirmado en el color de la marca, lo atendido en gris y lo pagado lleno. También la
 * usa el calendario de la plataforma (spec 035).
 */
export const BOARD_COLUMN_MARK: Record<Exclude<BoardColumn, "closed">, string> = {
  pending: "border-[1.5px] border-dashed border-ink/60",
  confirmed: "bg-ink/25 ring-[1.5px] ring-ink ring-inset",
  completed: "bg-muted-foreground/40",
  paid: "bg-ink",
};

type BoardAppointment = Pick<Appointment, "status" | "paidAt">;

/**
 * La columna de una cita: las pendientes, «Por confirmar»; las confirmadas, «Confirmadas»; las completadas,
 * «Atendidas» o, con el pago marcado, «Pagadas»; y las canceladas y las de «No asistió», la plegada. Una
 * pendiente o una confirmada que ya se pagó sigue en su columna, con la marca «Pagada».
 */
export function boardColumnOf(appointment: BoardAppointment): BoardColumn {
  return columnFor(appointment.status, Boolean(appointment.paidAt));
}

function columnFor(status: AppointmentStatus, paid: boolean): BoardColumn {
  switch (status) {
    case "pending":
      return "pending";
    case "confirmed":
      return "confirmed";
    case "completed":
      return paid ? "paid" : "completed";
    default:
      return "closed";
  }
}

/**
 * Lo que hace llevar una cita a otra columna, con las acciones de siempre de la cita y en este orden:
 * - `status`: el cambio de estado (PATCH …/status, con «Avisar al paciente»); null, no cambia;
 * - `paid`: el pago (PATCH …/payment): true lo marca, false lo quita; null, no se toca.
 */
export interface BoardAction {
  status: Extract<AppointmentStatus, "confirmed" | "completed"> | null;
  paid: boolean | null;
}

export type BoardMove =
  /** Se puede: lo que hace y dónde queda la cita (una pagada antes de atenderla queda en «Pagadas»). */
  | { allowed: true; action: BoardAction; lands: BoardColumn }
  /** No se puede: por qué, para el mensaje. */
  | { allowed: false; reason: string };

/** Por qué no se puede llevar una cita a esa columna (los mensajes del tablero). */
export const BOARD_MOVE_ERRORS = {
  toPending: "Ninguna cita vuelve a «Por confirmar».",
  locked:
    "Una cita atendida queda fija: no vuelve a «Confirmadas». Si es un error, el propietario la corrige desde la cita con «Corregir estado».",
  toClosed: "Para cancelarla o marcar «No asistió», ábrela: se hace desde la cita.",
  fromClosed: "Las canceladas y las de «No asistió» se cambian desde la cita.",
} as const;

const no = (reason: string): BoardMove => ({ allowed: false, reason });

/**
 * Qué pasa al llevar la cita a la columna `to`. null: es la suya (no se mueve). Se puede:
 * - de «Por confirmar» a «Confirmadas»: confirma la cita;
 * - de «Por confirmar» o «Confirmadas» a «Atendidas»: la marca completada (si ya estaba pagada, queda en
 *   «Pagadas»);
 * - de «Por confirmar», «Confirmadas» o «Atendidas» a «Pagadas»: la marca completada, si no lo estaba, y
 *   pagada, si no lo estaba;
 * - de «Pagadas» a «Atendidas»: quita el pago.
 * Lo demás vuelve a su sitio con su motivo.
 */
export function boardMove(appointment: BoardAppointment, to: BoardColumn): BoardMove | null {
  const from = boardColumnOf(appointment);
  if (from === to) return null;
  if (from === "closed") return no(BOARD_MOVE_ERRORS.fromClosed);
  if (to === "closed") return no(BOARD_MOVE_ERRORS.toClosed);
  if (to === "pending") return no(BOARD_MOVE_ERRORS.toPending);

  const paid = Boolean(appointment.paidAt);
  let action: BoardAction;
  if (from === "paid") {
    if (to !== "completed") return no(BOARD_MOVE_ERRORS.locked);
    action = { status: null, paid: false };
  } else if (from === "completed") {
    if (to !== "paid") return no(BOARD_MOVE_ERRORS.locked);
    action = { status: null, paid: true };
  } else if (to === "confirmed") {
    action = { status: "confirmed", paid: null };
  } else {
    // De «Por confirmar» o «Confirmadas» a «Atendidas» o «Pagadas».
    action = { status: "completed", paid: to === "paid" && !paid ? true : null };
  }

  // Las mismas reglas que la ficha de la cita y la API: si cambiaran, el tablero no se adelanta.
  if (action.status && !canChangeStatus(appointment.status, action.status)) return no(BOARD_MOVE_ERRORS.locked);
  const lands = columnFor(action.status ?? appointment.status, action.paid ?? paid);
  return { allowed: true, action, lands };
}

/**
 * Las columnas que ofrece el menú «Mover a…» de una cita: sólo las permitidas y, si dos hacen lo mismo
 * (una confirmada que ya se pagó queda en «Pagadas» al atenderla), una sola: la columna donde queda.
 */
export function boardTargets(appointment: BoardAppointment): { column: BoardColumn; action: BoardAction }[] {
  const targets: { column: BoardColumn; action: BoardAction }[] = [];
  for (const { id } of BOARD_COLUMNS) {
    const move = boardMove(appointment, id);
    if (!move?.allowed || move.lands !== id) continue;
    targets.push({ column: id, action: move.action });
  }
  return targets;
}
