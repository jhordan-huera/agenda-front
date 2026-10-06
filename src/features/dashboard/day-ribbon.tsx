import { useEffect, useRef } from "react";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { minutesToTime, timeToMinutes, type ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Appointment, BlockedTime, Schedule } from "@/types";
import { blocksOn, workingRangesOn, type MinuteSpan } from "./day-plan";

interface DayRibbonProps {
  bounds: MinuteSpan;
  now: ZonedNow;
  appointments: Appointment[];
  schedules: Schedule[];
  blockedTimes: BlockedTime[];
  nextId: string | null;
  clientName: (id: string) => string;
  onOpen: (appointment: Appointment) => void;
}

/**
 * El día completo en una franja: horario de atención (papel), fuera de horario (niebla),
 * bloqueos (rayado), las citas con el color de su estado y la línea de "ahora".
 * Lo ya pasado queda atenuado; la siguiente cita lleva el borde lila.
 */
export function DayRibbon({ bounds, now, appointments, schedules, blockedTimes, nextId, clientName, onOpen }: DayRibbonProps) {
  const span = bounds.end - bounds.start;
  const pct = (minutes: number) => `${((Math.min(Math.max(minutes, bounds.start), bounds.end) - bounds.start) / span) * 100}%`;
  const width = (from: number, to: number) => `${((Math.min(to, bounds.end) - Math.max(from, bounds.start)) / span) * 100}%`;
  const hours = Array.from({ length: span / 60 + 1 }, (_, i) => bounds.start + i * 60);
  const nowVisible = now.minutes > bounds.start && now.minutes < bounds.end;
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRatio = nowVisible ? (now.minutes - bounds.start) / span : null;

  const centered = useRef(false);

  // Si la franja no cabe (móvil), se abre centrada en la hora actual (sólo la primera vez:
  // después no se mueve sola mientras la persona la desliza).
  useEffect(() => {
    const element = scrollRef.current;
    if (centered.current || !element || nowRatio === null) return;
    centered.current = true;
    if (element.scrollWidth > element.clientWidth) {
      element.scrollLeft = nowRatio * element.scrollWidth - element.clientWidth / 2;
    }
  }, [nowRatio]);

  return (
    // En pantallas estrechas la franja se desliza de lado en vez de apretar las citas.
    <div ref={scrollRef} className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="relative min-w-[34rem]">
        <div className="relative h-24 overflow-hidden rounded-xl bg-muted ring-1 ring-border">
          {workingRangesOn(schedules, now.date).map((range, index) => (
            <span
              key={`${range.start}-${index}`}
              aria-hidden
              className="absolute inset-y-0 bg-background"
              style={{ left: pct(range.start), width: width(range.start, range.end) }}
            />
          ))}
          {blocksOn(blockedTimes, now.date).map((block) => (
            <span
              key={`${block.start}-${block.end}`}
              title={block.reason || "Bloqueado"}
              className="bg-hatch absolute inset-y-0 flex items-end px-1.5 pb-1 text-[11px] text-muted-foreground"
              style={{ left: pct(block.start), width: width(block.start, block.end) }}
            >
              <span className="truncate">{block.reason || "Bloqueado"}</span>
            </span>
          ))}
          {/* Lo que ya pasó, atenuado */}
          {now.minutes > bounds.start && (
            <span aria-hidden className="absolute inset-y-0 left-0 z-[1] bg-foreground/[0.035]" style={{ width: pct(now.minutes) }} />
          )}
          {appointments.map((appointment) => {
            const start = timeToMinutes(appointment.startTime);
            const end = timeToMinutes(appointment.endTime);
            const past = end <= now.minutes;
            return (
              <button
                key={appointment.id}
                type="button"
                onClick={() => onOpen(appointment)}
                aria-label={`${appointment.startTime}, ${clientName(appointment.clientId)}, ${APPOINTMENT_STATUS_CONFIG[appointment.status].label}`}
                className={cn(
                  "absolute inset-y-2.5 z-[2] overflow-hidden rounded-md border-l-[3px] px-2 py-1.5 text-left text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  APPOINTMENT_STATUS_CONFIG[appointment.status].event,
                  past && "opacity-60",
                  appointment.id === nextId && "ring-2 ring-highlight ring-offset-1",
                )}
                style={{ left: `calc(${pct(start)} + 2px)`, width: `calc(${width(start, end)} - 4px)` }}
              >
                <span className="block font-bold tabular-nums">{appointment.startTime}</span>
                <span className="block truncate font-semibold">{clientName(appointment.clientId)}</span>
              </button>
            );
          })}
          {nowVisible && (
            <span aria-hidden className="absolute inset-y-0 z-[3] w-0.5 -translate-x-1/2 bg-ink" style={{ left: pct(now.minutes) }}>
              <span className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-ink" />
            </span>
          )}
        </div>
        <div aria-hidden className="relative mt-1.5 h-4">
          {/* Junto a la etiqueta de "ahora" se omiten las horas que quedarían encima. */}
          {hours.filter((minutes) => !nowVisible || Math.abs(minutes - now.minutes) > span / 24).map((minutes) => (
            <span
              key={minutes}
              className={cn(
                "absolute text-[11px] text-muted-foreground tabular-nums",
                // La primera y la última hora se alinean hacia dentro para no salirse de la franja.
                minutes === bounds.start ? "translate-x-0" : minutes === bounds.end ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{ left: pct(minutes) }}
            >
              {minutesToTime(minutes)}
            </span>
          ))}
          {nowVisible && (
            <span
              className="absolute -translate-x-1/2 rounded bg-ink px-1 text-[11px] font-bold text-white tabular-nums"
              style={{ left: pct(now.minutes) }}
            >
              {minutesToTime(now.minutes)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
