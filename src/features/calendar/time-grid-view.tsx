import { Home } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getBlockedRanges, getWorkingRanges } from "@/lib/availability";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { formatDate, formatTimeRange } from "@/lib/format";
import { minutesToTime, type ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Appointment, BlockedTime, Client, ISODate, Schedule, Service } from "@/types";
import { layoutDayEvents } from "./calendar-utils";

const HOUR_HEIGHT = 56;
const MIN_EVENT_HEIGHT = 22;

interface TimeGridViewProps {
  days: ISODate[];
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
  schedules: Schedule[];
  now: ZonedNow;
  startHour: number;
  endHour: number;
  clientsById: Map<string, Client>;
  servicesById: Map<string, Service>;
  onSlotClick: (date: ISODate, time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

/**
 * Vista de rejilla horaria: un día (vista Día) o siete (vista Semana).
 * El padre la remonta (key) al cambiar de rango para recalcular el scroll inicial.
 */
export function TimeGridView(props: TimeGridViewProps) {
  const { days, now, startHour, endHour } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const columns = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;

  // Si hoy es visible, la vista arranca desplazada cerca de la hora actual.
  const [initialScrollTop] = useState(() =>
    days.includes(now.date) ? Math.max(0, (now.minutes / 60 - startHour - 1.5) * HOUR_HEIGHT) : 0,
  );
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = initialScrollTop;
  }, [initialScrollTop]);

  return (
    <div ref={scrollRef} className="max-h-[calc(100dvh-16rem)] min-h-96 overflow-auto rounded-xl border bg-background">
      <div className={cn(days.length > 1 && "min-w-[760px]")}>
        <div className="sticky top-0 z-20 grid border-b bg-background" style={{ gridTemplateColumns: columns }}>
          <div />
          {days.map((day) => {
            const isToday = day === now.date;
            return (
              <div key={day} className="border-l px-1 py-2 text-center">
                <p className={cn("text-xs text-muted-foreground uppercase", isToday && "font-medium text-primary")}>
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
                className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {i === 0 ? "" : minutesToTime(hour * 60)}
              </span>
            ))}
          </div>
          {days.map((day) => (
            <DayColumn key={day} day={day} {...props} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
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
}: TimeGridViewProps & { day: ISODate }) {
  const gridStart = startHour * 60;
  const gridEnd = endHour * 60;
  const toY = (minutes: number) => ((Math.min(Math.max(minutes, gridStart), gridEnd) - gridStart) / 60) * HOUR_HEIGHT;

  const events = layoutDayEvents(appointments.filter((a) => a.date === day));
  const blocks = blockedTimes.flatMap((block) =>
    getBlockedRanges([block], day).map((range) => ({ ...range, reason: block.reason, id: block.id })),
  );

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const halfHours = Math.floor(((event.clientY - rect.top) / HOUR_HEIGHT) * 2);
    onSlotClick(day, minutesToTime(Math.min(gridStart + halfHours * 30, gridEnd - 30)));
  };

  return (
    <div
      className="relative cursor-cell border-l bg-muted/60"
      onClick={handleClick}
      title="Haz clic en un hueco para crear una cita"
    >
      {getWorkingRanges(schedules, day).map((range) => (
        <div
          key={range.start}
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
        return (
          <button
            key={appointment.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAppointmentClick(appointment);
            }}
            aria-label={`${clientName}, ${formatTimeRange(appointment.startTime, appointment.endTime)}, ${serviceName}, ${status.label}${appointment.homeVisit ? ", a domicilio" : ""}`}
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
              {appointment.homeVisit && <Home className="size-3 shrink-0" aria-hidden />}
              <span className="truncate">{clientName}</span>
            </p>
            {height >= 36 && <p className="truncate opacity-80">{formatTimeRange(appointment.startTime, appointment.endTime)}</p>}
            {height >= 54 && <p className="truncate opacity-70">{serviceName}</p>}
          </button>
        );
      })}

      {day === now.date && now.minutes >= gridStart && now.minutes <= gridEnd && (
        <div className="pointer-events-none absolute inset-x-0 z-[2] h-0.5 bg-rose-500" style={{ top: toY(now.minutes) }}>
          <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-rose-500" />
        </div>
      )}
    </div>
  );
}
