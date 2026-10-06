import { Home, Video } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getBlockedRanges, getWorkingRanges } from "@/lib/availability";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { formatDate, formatTimeRange } from "@/lib/format";
import { minutesToTime, type ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Appointment, BlockedTime, Client, ISODate, Professional, Schedule, Service } from "@/types";
import { layoutDayEvents } from "./calendar-utils";

const HOUR_HEIGHT = 56;
const MIN_EVENT_HEIGHT = 22;

/**
 * Una columna de la rejilla: un día (de todas las agendas o de una) o, en la vista Día con varias
 * agendas, la de un profesional (`heading`: su nombre en la cabecera en lugar de la fecha).
 */
export interface GridColumn {
  key: string;
  day: ISODate;
  /** Sólo las citas, el horario y los bloqueos de esa agenda. Sin él: todas (y sólo los bloqueos de todo el negocio). */
  professionalId?: string;
  heading?: Pick<Professional, "displayName" | "color">;
}

interface TimeGridViewProps {
  days: ISODate[];
  /** Por defecto, una columna por día con todas las agendas. */
  columns?: GridColumn[];
  /** Con varias agendas: el color de cada profesional en sus citas. */
  professionalsById?: Map<string, Pick<Professional, "displayName" | "color">>;
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
  schedules: Schedule[];
  now: ZonedNow;
  startHour: number;
  endHour: number;
  clientsById: Map<string, Client>;
  servicesById: Map<string, Service>;
  onSlotClick: (date: ISODate, time: string, professionalId?: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

/**
 * Vista de rejilla horaria: un día (vista Día) o siete (vista Semana).
 * El padre la remonta (key) al cambiar de rango para recalcular el scroll inicial.
 */
export function TimeGridView(props: TimeGridViewProps) {
  const { days, now, startHour, endHour } = props;
  const gridColumns: GridColumn[] = props.columns ?? days.map((day) => ({ key: day, day }));
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const columns = `3.5rem repeat(${gridColumns.length}, minmax(0, 1fr))`;
  const currentHour = days.includes(now.date) ? Math.floor(now.minutes / 60) : null;

  // Si hoy es visible, la vista arranca desplazada cerca de la hora actual.
  const [initialScrollTop] = useState(() =>
    days.includes(now.date) ? Math.max(0, (now.minutes / 60 - startHour - 1.5) * HOUR_HEIGHT) : 0,
  );
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = initialScrollTop;
  }, [initialScrollTop]);

  return (
    <div ref={scrollRef} className="max-h-[calc(100dvh-16rem)] min-h-96 overflow-auto rounded-xl border bg-background">
      <div style={{ minWidth: gridColumns.length > 1 ? Math.max(760, 56 + gridColumns.length * 150) : undefined }}>
        <div className="sticky top-0 z-20 grid border-b bg-background" style={{ gridTemplateColumns: columns }}>
          <div />
          {gridColumns.map(({ key, day, heading }) => {
            const isToday = day === now.date;
            if (heading) {
              return (
                <div key={key} className="flex min-w-0 items-center justify-center gap-1.5 border-l px-2 py-3 text-sm font-semibold">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: heading.color }} />
                  <span className="truncate">{heading.displayName}</span>
                </div>
              );
            }
            return (
              <div key={key} className="border-l px-1 py-2 text-center">
                <p className={cn("text-xs text-muted-foreground", isToday && "font-medium text-primary")}>
                  {formatDate(day, "EEE")}
                </p>
                <p
                  className={cn(
                    "mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {formatDate(day, "d")}
                </p>
              </div>
            );
          })}
        </div>

        <div className="relative grid" style={{ gridTemplateColumns: columns, height: hours.length * HOUR_HEIGHT }}>
          <div className="relative" aria-hidden>
            {hours.map((hour, i) => (
              <span
                key={hour}
                className={cn(
                  "absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums",
                  // La hora en curso, marcada con el resaltador como en la agenda de papel.
                  hour === currentHour && "marker font-bold text-ink",
                )}
                style={{ top: i * HOUR_HEIGHT }}
              >
                {i === 0 ? "" : minutesToTime(hour * 60)}
              </span>
            ))}
          </div>
          {gridColumns.map((column) => (
            <DayColumn key={column.key} column={column} {...props} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  column,
  professionalsById,
  appointments,
  blockedTimes,
  schedules,
  now,
  startHour,
  endHour,
  clientsById,
  servicesById,
  onSlotClick,
  onAppointmentClick,
}: TimeGridViewProps & { column: GridColumn }) {
  const { day, professionalId } = column;
  const gridStart = startHour * 60;
  const gridEnd = endHour * 60;
  const toY = (minutes: number) => ((Math.min(Math.max(minutes, gridStart), gridEnd) - gridStart) / 60) * HOUR_HEIGHT;

  const events = layoutDayEvents(
    appointments.filter((a) => a.date === day && (!professionalId || a.professionalId === professionalId)),
  );
  // Bloqueos: los de todo el negocio y, en la columna de una agenda, los suyos.
  const blocks = blockedTimes
    .filter((block) => block.professionalId === null || block.professionalId === professionalId)
    .flatMap((block) => getBlockedRanges([block], day).map((range) => ({ ...range, reason: block.reason, id: block.id })));
  // Horario de atención: el de la agenda o, con todas, el de cualquiera de ellas.
  const agendaIds = professionalId ? [professionalId] : [...new Set(schedules.map((s) => s.professionalId))];
  const workingRanges = agendaIds.flatMap((id) => getWorkingRanges(schedules.filter((s) => s.professionalId === id), day));

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const halfHours = Math.floor(((event.clientY - rect.top) / HOUR_HEIGHT) * 2);
    onSlotClick(day, minutesToTime(Math.min(gridStart + halfHours * 30, gridEnd - 30)), professionalId);
  };

  return (
    <div
      className="relative cursor-cell border-l bg-muted/60"
      onClick={handleClick}
      title="Haz clic en un hueco para crear una cita"
    >
      {workingRanges.map((range, index) => (
        <div
          key={`${range.start}-${index}`}
          className="absolute inset-x-0 bg-background"
          style={{ top: toY(range.start), height: toY(range.end) - toY(range.start) }}
        />
      ))}
      {Array.from({ length: endHour - startHour }, (_, i) => (
        <div key={i} className="pointer-events-none absolute inset-x-0" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
          <div className="border-t" />
          <div className="mt-[27px] border-t border-dashed border-border/60" />
        </div>
      ))}
      {blocks.map((block) => (
        <div
          key={`${block.id}-${block.start}`}
          className="bg-hatch pointer-events-none absolute inset-x-0 border-y border-border/60 bg-muted/70 px-1.5 py-1"
          style={{ top: toY(block.start), height: toY(block.end) - toY(block.start) }}
        >
          <span className="text-[11px] font-medium text-muted-foreground">{block.reason}</span>
        </div>
      ))}

      {events.map(({ item: appointment, start, end, lane, lanes }) => {
        const top = toY(start);
        const height = Math.max(toY(end) - top, MIN_EVENT_HEIGHT);
        const clientName = clientsById.get(appointment.clientId)?.name ?? "Cliente";
        const serviceName = servicesById.get(appointment.serviceId)?.name ?? "";
        const status = APPOINTMENT_STATUS_CONFIG[appointment.status];
        // Con todas las agendas en la misma columna, el color del profesional junto al nombre.
        const professional = !professionalId ? professionalsById?.get(appointment.professionalId) : undefined;
        return (
          <button
            key={appointment.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAppointmentClick(appointment);
            }}
            aria-label={`${clientName}, ${formatTimeRange(appointment.startTime, appointment.endTime)}, ${serviceName}, ${status.label}${appointment.homeVisit ? ", a domicilio" : appointment.isVirtual ? ", virtual" : ""}${professional ? `, con ${professional.displayName}` : ""}`}
            className={cn(
              "absolute z-[1] overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-xs leading-tight shadow-xs transition-colors outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring",
              status.event,
            )}
            style={{
              top: top + 1,
              height: height - 2,
              left: `calc(${(lane / lanes) * 100}% + 2px)`,
              width: `calc(${100 / lanes}% - 4px)`,
            }}
          >
            <p className="flex items-center gap-1 truncate font-semibold">
              {professional && (
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: professional.color }} />
              )}
              {appointment.homeVisit && <Home className="size-3 shrink-0" aria-hidden />}
              {appointment.isVirtual && <Video className="size-3 shrink-0" aria-hidden />}
              <span className="truncate">{clientName}</span>
            </p>
            {height >= 36 && <p className="truncate opacity-80">{formatTimeRange(appointment.startTime, appointment.endTime)}</p>}
            {height >= 54 && <p className="truncate opacity-70">{serviceName}</p>}
          </button>
        );
      })}

      {day === now.date && now.minutes >= gridStart && now.minutes <= gridEnd && (
        <div className="pointer-events-none absolute inset-x-0 z-[2] h-0.5 bg-ink" style={{ top: toY(now.minutes) }}>
          <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-ink" />
        </div>
      )}
    </div>
  );
}
