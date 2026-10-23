import {
  ArrowRightLeft,
  ChevronsLeft,
  CircleCheck,
  CircleSlash,
  FileCheck2,
  Globe,
  Landmark,
  Loader2,
  UserX,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { clientConfirmationSummary, getAppointmentClientNames } from "@/features/appointments/appointment-utils";
import { ProfessionalDot } from "@/features/professionals/professional-select";
import { useSetAppointmentPaid, useUpdateAppointmentStatus } from "@/hooks/queries/use-appointments";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useOverflowsX } from "@/hooks/use-overflows-x";
import { getErrorMessage } from "@/lib/data";
import { capitalize, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Appointment, Client, ISODate, Professional, Service } from "@/types";
import {
  BOARD_COLUMN_MARK,
  BOARD_COLUMNS,
  BOARD_COLUMN_TITLES,
  boardColumnOf,
  boardMove,
  boardTargets,
  type BoardAction,
  type BoardColumn,
} from "./board-columns";
import { BOARD_PERIODS, type CalendarPeriod } from "./calendar-utils";

interface BoardViewProps {
  /** Las citas del periodo, ya con el filtro de profesional y «Mostrar canceladas» de la Agenda. */
  appointments: Appointment[];
  today: ISODate;
  clientsById: Map<string, Client>;
  servicesById: Map<string, Service>;
  /** Con varias agendas a la vez: quién atiende cada cita. */
  professionalsById?: Map<string, Pick<Professional, "displayName" | "color">>;
  /** Puede cambiar el estado y el pago (`appointments.manage`): arrastrar y «Mover a…». */
  canMove: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
}

/** Una cita que se lleva a otra columna, a la espera de la confirmación. */
interface MoveRequest {
  appointment: Appointment;
  action: BoardAction;
  lands: BoardColumn;
}

/** Las cuatro columnas del recorrido; la plegada va aparte. */
const FLOW_COLUMNS = BOARD_COLUMNS.filter(
  (column): column is { id: Exclude<BoardColumn, "closed">; title: string } => column.id !== "closed",
);

/** Cada columna se desplaza por dentro, con su cifra arriba; a lo alto, lo que deja la pantalla. */
const LIST_HEIGHT = "max-h-[max(20rem,calc(100dvh-22rem))] min-h-32";

/**
 * El tablero de las citas (spec 034): las del periodo en cuatro columnas (Por confirmar, Confirmadas,
 * Atendidas y Pagadas) y la plegada de «No asistió / Canceladas», que sólo se consulta. Una cita se lleva a
 * otra columna arrastrándola (sólo con puntero fino: ratón o trackpad) o con su menú «Mover a…» (el teclado y
 * el celular), siempre con una confirmación y con las acciones de la cita: el estado (con «Avisar al
 * paciente») y el pago. Tocar la tarjeta abre la cita. En el celular, las columnas se deslizan dentro de su
 * caja, nunca la página.
 */
export function BoardView({
  appointments,
  today,
  clientsById,
  servicesById,
  professionalsById,
  canMove,
  onAppointmentClick,
}: BoardViewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const scrollable = useOverflowsX(boxRef);
  // Arrastrar sólo con ratón o trackpad: en el celular el dedo desliza las columnas y se usa «Mover a…».
  const finePointer = useMediaQuery("(pointer: fine)");
  const canDrag = canMove && finePointer;
  const [closedOpen, setClosedOpen] = useState(false);
  const [dragging, setDragging] = useState<Appointment | null>(null);
  const [over, setOver] = useState<BoardColumn | null>(null);
  // La cita del diálogo de confirmación: se queda al cerrarlo, para que no se vacíe mientras se va.
  const [request, setRequest] = useState<(MoveRequest & { key: number }) | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Las citas que se están guardando se ven ya en su columna nueva; si falla, vuelven a la suya.
  const [saving, setSaving] = useState<Record<string, BoardColumn>>({});
  const updateStatus = useUpdateAppointmentStatus();
  const setPaid = useSetAppointmentPaid();
  const showError = useErrorToast();

  const columnOf = (appointment: Appointment) => saving[appointment.id] ?? boardColumnOf(appointment);
  const sorted = [...appointments].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const byColumn = new Map<BoardColumn, Appointment[]>(BOARD_COLUMNS.map(({ id }) => [id, []]));
  for (const appointment of sorted) byColumn.get(columnOf(appointment))!.push(appointment);

  const namesOf = (appointment: Appointment) => getAppointmentClientNames(clientsById, appointment, { fallback: "Cliente" });

  /** Llevar la cita a otra columna: si se puede, se pide la confirmación; si no, vuelve con el motivo. */
  const ask = (appointment: Appointment, to: BoardColumn) => {
    const move = boardMove(appointment, to);
    if (!move) return;
    if (!move.allowed) {
      toast.error(move.reason);
      return;
    }
    setRequest((current) => ({ appointment, action: move.action, lands: move.lands, key: (current?.key ?? 0) + 1 }));
    setDialogOpen(true);
  };

  /** Las acciones de la cita, en orden: el estado y, después, el pago. */
  const run = async ({ appointment, action, lands }: MoveRequest, notify: boolean) => {
    const { id } = appointment;
    setSaving((current) => ({ ...current, [id]: lands }));
    try {
      if (action.status) {
        try {
          await updateStatus.mutateAsync({ id, status: action.status, notify, onlyIfOpen: true });
        } catch (error) {
          showError(error);
          return;
        }
      }
      if (action.paid !== null) {
        try {
          await setPaid.mutateAsync({ id, paid: action.paid });
        } catch (error) {
          // El estado ya cambió: la cita queda atendida, sin el pago, y se dice.
          if (action.status) {
            toast.error("La cita quedó atendida, pero no se pudo marcar como pagada", {
              description: `${getErrorMessage(error)} Vuelve a intentarlo con «Mover a…».`,
            });
          } else {
            showError(error);
          }
          return;
        }
      }
      toast.success(describeMove({ appointment, action, lands }).success, {
        description: action.status && !notify ? "Sin avisar al paciente." : undefined,
      });
    } finally {
      setSaving(({ [id]: _done, ...rest }) => rest);
    }
  };

  const dropProps = (column: BoardColumn) =>
    canDrag
      ? {
          onDragOver: (event: DragEvent) => {
            if (!dragging) return;
            // También sobre las prohibidas: al soltar, la tarjeta vuelve y el mensaje dice por qué.
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            if (over !== column) setOver(column);
          },
          onDragLeave: (event: DragEvent) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver((current) => (current === column ? null : current));
          },
          onDrop: (event: DragEvent) => {
            event.preventDefault();
            const appointment = dragging;
            setDragging(null);
            setOver(null);
            if (appointment) ask(appointment, column);
          },
        }
      : {};

  /** Mientras se arrastra: la columna donde se puede soltar, resaltada; la de debajo del puntero, más. */
  const dropState = (column: BoardColumn) => {
    if (!dragging) return "idle" as const;
    const move = boardMove(dragging, column);
    if (!move) return "idle" as const;
    if (!move.allowed) return "blocked" as const;
    return over === column ? ("over" as const) : ("open" as const);
  };

  const cardProps = {
    today,
    servicesById,
    professionalsById,
    namesOf,
    onOpen: onAppointmentClick,
    onMove: ask,
    draggingId: dragging?.id ?? null,
    canMove,
    canDrag,
    onDragStart: (appointment: Appointment) => setDragging(appointment),
    onDragEnd: () => {
      setDragging(null);
      setOver(null);
    },
  };

  const closed = byColumn.get("closed")!;

  return (
    <div className="space-y-2">
      {canMove && (
        <p className="text-sm text-muted-foreground">
          {canDrag
            ? "Arrastra una tarjeta a otra columna o usa «Mover a…». Siempre se pide confirmación."
            : "Usa «Mover a…» en cada tarjeta para llevarla a otra columna. Siempre se pide confirmación."}
        </p>
      )}
      {/* `relative`: los textos sólo para el lector de pantalla (posición absoluta) quedan dentro de la caja. */}
      <div
        ref={boxRef}
        role="region"
        aria-label="Tablero de las citas"
        tabIndex={scrollable ? 0 : undefined}
        className="relative snap-x snap-mandatory scroll-px-2 overflow-x-auto overscroll-x-contain rounded-xl border bg-background p-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:scroll-px-3 sm:p-3"
      >
        <div
          className={cn(
            "grid gap-2.5 sm:gap-3",
            // Abierta la quinta, las columnas se estrechan para que las cinco quepan en el computador.
            closedOpen ? "grid-cols-[repeat(5,minmax(12.5rem,1fr))]" : "grid-cols-[repeat(4,minmax(14.5rem,1fr))_auto]",
          )}
        >
          {FLOW_COLUMNS.map(({ id, title }) => {
            const items = byColumn.get(id)!;
            const state = dropState(id);
            return (
              <section
                key={id}
                aria-labelledby={`board-${id}`}
                {...dropProps(id)}
                className={cn(
                  "flex min-w-0 snap-start flex-col rounded-lg bg-canvas ring-1 ring-transparent motion-safe:transition-[box-shadow,background-color,opacity] motion-safe:duration-150",
                  state === "open" && "ring-ink/35",
                  state === "over" && "bg-accent ring-2 ring-ink",
                  state === "blocked" && "opacity-55",
                )}
              >
                <ColumnHeading id={`board-${id}`} title={title} count={items.length} mark={<span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", BOARD_COLUMN_MARK[id])} />} />
                <ColumnList items={items} empty={state === "open" || state === "over" ? "Suelta aquí" : "Sin citas"}>
                  {items.map((appointment) => (
                    <BoardCard key={appointment.id} appointment={appointment} column={id} saving={appointment.id in saving} {...cardProps} />
                  ))}
                </ColumnList>
              </section>
            );
          })}

          {/* «No asistió / Canceladas», plegada al principio: sólo se consulta. */}
          <section
            aria-labelledby="board-closed"
            {...dropProps("closed")}
            className={cn(
              "flex min-w-0 snap-start flex-col rounded-lg bg-canvas motion-safe:transition-opacity motion-safe:duration-150",
              dropState("closed") === "blocked" && "opacity-55",
            )}
          >
            {closedOpen ? (
              <>
                <ColumnHeading
                  id="board-closed"
                  title={BOARD_COLUMN_TITLES.closed}
                  count={closed.length}
                  mark={<CircleSlash className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                  action={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Plegar «No asistió / Canceladas»"
                      aria-expanded
                      aria-controls="board-closed-list"
                      onClick={() => setClosedOpen(false)}
                    >
                      <ChevronsLeft />
                    </Button>
                  }
                />
                <ColumnList id="board-closed-list" items={closed} empty="Sin citas">
                  {closed.map((appointment) => (
                    <BoardCard key={appointment.id} appointment={appointment} column="closed" saving={false} {...cardProps} />
                  ))}
                </ColumnList>
              </>
            ) : (
              <button
                type="button"
                id="board-closed"
                aria-expanded={false}
                aria-controls="board-closed-list"
                onClick={() => {
                  setClosedOpen(true);
                  // Si no cabe (el celular), la caja se desliza hasta ella: no queda cortada por el borde.
                  requestAnimationFrame(() => boxRef.current?.scrollTo({ left: boxRef.current.scrollWidth }));
                }}
                className="flex h-full min-h-48 w-11 flex-col items-center gap-2.5 rounded-lg px-1 py-3 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <CircleSlash className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="[writing-mode:vertical-rl]">{BOARD_COLUMN_TITLES.closed}</span>
                <CountChip count={closed.length} />
                <span className="sr-only">. Abrir la columna</span>
              </button>
            )}
          </section>
        </div>
      </div>
      {scrollable && (
        <p aria-hidden className="text-xs text-muted-foreground">
          Desliza para ver todas las columnas
        </p>
      )}

      <MoveDialog
        request={request}
        open={dialogOpen}
        names={request ? namesOf(request.appointment) : ""}
        onOpenChange={setDialogOpen}
        onConfirm={(notify) => {
          setDialogOpen(false);
          if (request) void run(request, notify);
        }}
      />
    </div>
  );
}

function CountChip({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums shadow-sheet">
      <span className="sr-only">, </span>
      {count}
      <span className="sr-only"> {count === 1 ? "cita" : "citas"}</span>
    </span>
  );
}

function ColumnHeading({
  id,
  title,
  count,
  mark,
  action,
}: {
  id: string;
  title: string;
  count: number;
  mark: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-1.5 px-2.5 pt-2.5 pb-2">
      {/* El título entero, en dos líneas si hace falta («No asistió / Canceladas» con las cinco abiertas). */}
      <h3 id={id} className="flex min-w-0 items-baseline gap-1.5 text-sm leading-6 font-semibold">
        <span className="flex h-6 shrink-0 items-center self-start">{mark}</span>
        <span>{title}</span>
      </h3>
      <span className="ml-auto flex h-6 shrink-0 items-center gap-1">
        <CountChip count={count} />
        {action}
      </span>
    </div>
  );
}

function ColumnList({ id, items, empty, children }: { id?: string; items: Appointment[]; empty: string; children: ReactNode }) {
  if (items.length === 0) {
    return (
      <div id={id} className={cn("px-2 pb-2", LIST_HEIGHT)}>
        <p className="rounded-lg border border-dashed border-rule-strong px-3 py-6 text-center text-xs text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return (
    <ul id={id} className={cn("space-y-2 overflow-y-auto overscroll-y-contain px-2 pb-2", LIST_HEIGHT)}>
      {children}
    </ul>
  );
}

interface BoardCardProps {
  appointment: Appointment;
  column: BoardColumn;
  today: ISODate;
  servicesById: Map<string, Service>;
  professionalsById?: Map<string, Pick<Professional, "displayName" | "color">>;
  namesOf: (appointment: Appointment) => string;
  onOpen: (appointment: Appointment) => void;
  onMove: (appointment: Appointment, to: BoardColumn) => void;
  /** Se está guardando su movimiento. */
  saving: boolean;
  draggingId: string | null;
  canMove: boolean;
  canDrag: boolean;
  onDragStart: (appointment: Appointment) => void;
  onDragEnd: () => void;
}

/** Una marca de la tarjeta: con texto y no sólo el icono, también para el lector de pantalla. */
interface Mark {
  icon: LucideIcon;
  label: string;
  tone?: "confirmed" | "brand";
}

/** Las marcas de la tarjeta, sólo cuando aplican. El verde es sólo para «Confirmó que va». */
function marksOf(appointment: Appointment): Mark[] {
  const open = appointment.status === "pending" || appointment.status === "confirmed";
  const marks: Mark[] = [];
  if (appointment.status === "cancelled") marks.push({ icon: XCircle, label: "Cancelada" });
  if (appointment.status === "no_show") marks.push({ icon: UserX, label: "No asistió" });
  if (open && appointment.source === "booking_page") marks.push({ icon: Globe, label: "Reserva online" });
  const confirmation = open ? clientConfirmationSummary(appointment) : null;
  if (confirmation) {
    marks.push({ icon: CircleCheck, label: confirmation.total === 1 ? "Confirmó que va" : confirmation.label, tone: "confirmed" });
  }
  if (appointment.receiptAt && !appointment.paidAt) marks.push({ icon: FileCheck2, label: "Comprobante recibido" });
  // Pagada antes de atenderla (las completadas pagadas ya están en «Pagadas»).
  if (appointment.paidAt && appointment.status !== "completed") marks.push({ icon: Landmark, label: "Pagada", tone: "brand" });
  return marks;
}

function BoardCard({
  appointment,
  column,
  today,
  servicesById,
  professionalsById,
  namesOf,
  onOpen,
  onMove,
  saving,
  draggingId,
  canMove,
  canDrag,
  onDragStart,
  onDragEnd,
}: BoardCardProps) {
  const names = namesOf(appointment);
  const serviceName = servicesById.get(appointment.serviceId)?.name ?? "";
  const professional = professionalsById?.get(appointment.professionalId);
  const closed = column === "closed";
  const targets = canMove && !closed ? boardTargets(appointment) : [];
  const draggable = canDrag && !closed && !saving && targets.length > 0;
  const day = appointment.date === today ? "Hoy" : capitalize(formatDate(appointment.date, "EEE d MMM"));
  const marks = marksOf(appointment);
  const withButton = targets.length > 0 || saving;

  // La tarjeta es un `div` con rol de botón y no un `<button>`: Firefox no arrastra los botones.
  const open = () => onOpen(appointment);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  };

  return (
    <li
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", appointment.id);
        onDragStart(appointment);
      }}
      onDragEnd={onDragEnd}
      aria-busy={saving || undefined}
      className={cn(
        "relative rounded-lg bg-card",
        column === "pending" ? "border border-dashed border-ink/45" : "shadow-sheet",
        draggable && "cursor-grab active:cursor-grabbing",
        draggingId === appointment.id && "opacity-50",
        saving && "opacity-70",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        data-board-card={appointment.id}
        onClick={open}
        onKeyDown={onKeyDown}
        className={cn(
          "block w-full rounded-lg p-3 text-left outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50",
          draggable ? "select-none" : "cursor-pointer",
        )}
      >
        {/* Sólo las dos primeras líneas dejan sitio al botón «Mover a…»: lo de abajo usa todo el ancho. */}
        <span className={cn("block text-xs text-muted-foreground tabular-nums", withButton && "pr-8")}>
          {day} · {appointment.startTime}
        </span>
        <span
          className={cn(
            "mt-1 line-clamp-2 block text-sm leading-snug font-semibold",
            withButton && "pr-6",
            closed && "text-muted-foreground",
            appointment.status === "cancelled" && "line-through",
          )}
        >
          {names}
        </span>
        {serviceName && <span className="block text-[13px] leading-snug text-muted-foreground">{serviceName}</span>}
        {professional && (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ProfessionalDot color={professional.color} className="size-2" />
            <span className="truncate">{professional.displayName}</span>
          </span>
        )}
        {marks.length > 0 && (
          <span className="mt-2.5 flex flex-wrap gap-1">
            {marks.map(({ icon: Icon, label, tone }) => (
              <span
                key={label}
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xs leading-snug font-medium",
                  tone === "confirmed"
                    ? "bg-confirmed/10 text-confirmed"
                    : tone === "brand"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {label}
              </span>
            ))}
          </span>
        )}
      </div>

      {saving ? (
        <Loader2 className="absolute top-2.5 right-2.5 size-4 animate-spin text-muted-foreground" aria-label="Guardando" />
      ) : (
        targets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="absolute top-1 right-1" aria-label={`Mover a… la cita de ${names}`}>
                <ArrowRightLeft />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-44">
              <DropdownMenuLabel>Mover a…</DropdownMenuLabel>
              {targets.map(({ column: target }) => (
                <DropdownMenuItem key={target} onSelect={() => onMove(appointment, target)}>
                  {target !== "closed" && <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", BOARD_COLUMN_MARK[target])} />}
                  {BOARD_COLUMN_TITLES[target]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
    </li>
  );
}

/** El título, el texto y el botón de la confirmación, y lo que dice el aviso al terminar. */
function describeMove({ appointment, action, lands }: MoveRequest, names = "") {
  const when = `${formatDate(appointment.date, "EEEE d 'de' MMMM")} a las ${appointment.startTime}`;
  const subject = `La cita de ${names} del ${when}`;
  const fixed = "Queda completada: después sólo cambian el pago, los comprobantes y las notas.";
  if (action.status === "confirmed") {
    return { title: "¿Confirmar la cita?", description: `${subject} pasa a «Confirmadas».`, confirm: "Confirmar cita", success: "Cita confirmada" };
  }
  if (action.status === "completed" && action.paid) {
    return {
      title: "¿Marcar la cita como atendida y pagada?",
      description: `${subject} pasa a «Pagadas». ${fixed}`,
      confirm: "Marcar atendida y pagada",
      success: "Cita atendida y pagada",
    };
  }
  if (action.status === "completed") {
    return {
      title: "¿Marcar la cita como atendida?",
      description:
        lands === "paid"
          ? `${subject} pasa a «Pagadas», porque ya estaba pagada. ${fixed}`
          : `${subject} pasa a «Atendidas». ${fixed}`,
      confirm: "Marcar como atendida",
      success: "Cita atendida",
    };
  }
  if (action.paid) {
    return { title: "¿Marcar la cita como pagada?", description: `${subject} pasa a «Pagadas».`, confirm: "Marcar como pagada", success: "Cita marcada como pagada" };
  }
  return { title: "¿Quitar el pago?", description: `${subject} vuelve a «Atendidas», sin pagar.`, confirm: "Quitar el pago", success: "Pago quitado" };
}

/** Al cerrar el diálogo, el foco vuelve a la tarjeta, que puede estar ya en otra columna. */
function focusCard(appointmentId: string) {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-board-card="${appointmentId}"]`)?.focus());
}

/**
 * La confirmación de un movimiento: qué va a pasar y, si cambia el estado, «Avisar al paciente» (spec 008),
 * marcada como en la ficha de la cita. Se cierra al confirmar: la tarjeta ya se ve en su columna nueva
 * mientras se guarda, y el aviso de WhatsApp no queda apilado con este diálogo.
 */
function MoveDialog({
  request,
  open,
  names,
  onOpenChange,
  onConfirm,
}: {
  request: (MoveRequest & { key: number }) | null;
  open: boolean;
  names: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notify: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (!request) return;
          event.preventDefault();
          focusCard(request.appointment.id);
        }}
      >
        {/* De cero en cada movimiento: «Avisar al paciente» siempre empieza marcada. */}
        {request && <MoveDialogBody key={request.key} request={request} names={names} onConfirm={onConfirm} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MoveDialogBody({ request, names, onConfirm }: { request: MoveRequest; names: string; onConfirm: (notify: boolean) => void }) {
  const [notify, setNotify] = useState(true);
  const text = describeMove(request, names);
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{text.title}</AlertDialogTitle>
        <AlertDialogDescription>{text.description}</AlertDialogDescription>
      </AlertDialogHeader>
      {request.action.status && (
        <div className="flex items-start gap-2">
          <Checkbox
            id="board-notify-patient"
            checked={notify}
            onCheckedChange={(checked) => setNotify(checked === true)}
            aria-describedby="board-notify-patient-hint"
            className="mt-0.5"
          />
          <div className="grid gap-0.5">
            <Label htmlFor="board-notify-patient" className="font-normal">
              Avisar al paciente por email y WhatsApp
            </Label>
            <p id="board-notify-patient-hint" className="text-xs text-muted-foreground">
              Desmárcala si sólo corriges un error.
            </p>
          </div>
        </div>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel>Volver</AlertDialogCancel>
        <Button onClick={() => onConfirm(notify)}>{text.confirm}</Button>
      </AlertDialogFooter>
    </>
  );
}

/**
 * El periodo del tablero: «Hoy», la semana (por defecto) o el mes. Las flechas de la Agenda pasan al
 * anterior y al siguiente.
 */
export function BoardPeriodSelect({ value, onChange }: { value: CalendarPeriod; onChange: (period: CalendarPeriod) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span id="board-period" className="text-sm text-muted-foreground">
        Periodo
      </span>
      <div role="group" aria-labelledby="board-period" className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px]">
        {BOARD_PERIODS.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex h-full items-center rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap text-foreground/60 outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:transition-[color,background-color,box-shadow] dark:text-muted-foreground dark:hover:text-foreground",
                active && "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30 dark:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
