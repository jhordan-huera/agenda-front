import { useEffect, useRef, useState } from "react";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { minutesToTime, timeToMinutes, type ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Appointment, BlockedTime, Schedule } from "@/types";
import { blocksOn, workingRangesOn, type MinuteSpan } from "./day-plan";

/** Aire entre dos horas escritas, y lo que la de "ahora" ocupa de más por su fondo (px-1). */
const LABEL_GAP = 4;
const NOW_LABEL_PADDING = 8;
/** Cada cuántas horas se escriben, del más corto al más largo: el primero en el que caben. */
const HOUR_STEPS = [1, 2, 3, 4, 6];

/**
 * Las horas que se escriben bajo una franja de `width` px sin que se toquen (`textWidth`: lo que mide
 * "00:00" escrito, que cambia según el dispositivo): cada 1, 2, 3… horas (el paso más corto que cabe),
 * con prioridad para la etiqueta de "ahora" y para la primera y la última hora (alineadas hacia
 * dentro); la que quede encima de una de ésas se omite.
 */
function hoursThatFit(hours: number[], bounds: MinuteSpan, nowMinutes: number | null, width: number, textWidth: number): Set<number> {
  const LABEL_WIDTH = textWidth + LABEL_GAP;
  const NOW_LABEL_WIDTH = textWidth + NOW_LABEL_PADDING + LABEL_GAP;
  const span = bounds.end - bounds.start;
  const x = (minutes: number) => ((minutes - bounds.start) / span) * width;
  const pxPerHour = width / (span / 60);
  const step = HOUR_STEPS.find((hoursApart) => hoursApart * pxPerHour >= LABEL_WIDTH) ?? HOUR_STEPS[HOUR_STEPS.length - 1];
  const boxOf = (minutes: number): [number, number] =>
    minutes === bounds.start
      ? [0, LABEL_WIDTH]
      : minutes === bounds.end
        ? [width - LABEL_WIDTH, width]
        : [x(minutes) - LABEL_WIDTH / 2, x(minutes) + LABEL_WIDTH / 2];
  const taken: [number, number][] = nowMinutes === null ? [] : [[x(nowMinutes) - NOW_LABEL_WIDTH / 2, x(nowMinutes) + NOW_LABEL_WIDTH / 2]];
  const fits = ([from, to]: [number, number]) => taken.every(([a, b]) => to <= a || from >= b);
  const onStep = (minutes: number) => ((minutes - bounds.start) / 60) % step === 0;
  const shown = new Set<number>();
  const order = [bounds.start, bounds.end, ...hours.filter((minutes) => minutes !== bounds.start && minutes !== bounds.end && onStep(minutes))];
  for (const minutes of order) {
    const box = boxOf(minutes);
    if (!fits(box)) continue;
    taken.push(box);
    shown.add(minutes);
  }
  return shown;
}

interface DayRibbonProps {
  bounds: MinuteSpan;
  now: ZonedNow;
  appointments: Appointment[];
  schedules: Schedule[];
  blockedTimes: BlockedTime[];
  nextId: string | null;
  /** Los nombres de los pacientes de la cita ("Ana Torres y Carlos Pérez"). */
  clientName: (appointment: Appointment) => string;
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
  // Las horas que caben debajo de la franja, según su ancho real (cambia al girar el móvil o al
  // redimensionar la ventana) y lo que mide una hora escrita en este dispositivo (se vuelve a medir
  // cuando carga la letra). Mientras no se mide, valores de un móvil.
  const axisRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [axisWidth, setAxisWidth] = useState(300);
  const [textWidth, setTextWidth] = useState(32);
  useEffect(() => {
    const axis = axisRef.current;
    const probe = probeRef.current;
    if (!axis || !probe) return;
    const measure = () => {
      setAxisWidth(axis.getBoundingClientRect().width || 300);
      setTextWidth(probe.getBoundingClientRect().width || 32);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(axis);
    let active = true;
    void document.fonts?.ready.then(() => active && measure());
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);
  const shownHours = hoursThatFit(hours, bounds, nowVisible ? now.minutes : null, axisWidth, textWidth);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRatio = nowVisible ? (now.minutes - bounds.start) / span : null;

  const centered = useRef(false);

  // Si la franja no cabe, se abre centrada en la hora actual (sólo la primera vez: después no se
  // mueve sola mientras la persona la desliza).
  useEffect(() => {
    const element = scrollRef.current;
    if (centered.current || !element || nowRatio === null) return;
    centered.current = true;
    if (element.scrollWidth > element.clientWidth) {
      element.scrollLeft = nowRatio * element.scrollWidth - element.clientWidth / 2;
    }
  }, [nowRatio]);

  return (
    // En el móvil la franja cabe entera (las citas, sólo con su color; el detalle va en la lista de
    // abajo). En pantallas algo más anchas que no lleguen a su ancho mínimo, se desliza de lado.
    <div ref={scrollRef} className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="relative sm:min-w-[34rem]">
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
                aria-label={`${appointment.startTime}, ${clientName(appointment)}, ${APPOINTMENT_STATUS_CONFIG[appointment.status].label}`}
                className={cn(
                  "absolute inset-y-2.5 z-[2] overflow-hidden rounded-md border-l-[3px] text-left text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-2 sm:py-1.5",
                  APPOINTMENT_STATUS_CONFIG[appointment.status].event,
                  past && "opacity-60",
                  appointment.id === nextId && "ring-2 ring-highlight ring-offset-1",
                )}
                style={{ left: `calc(${pct(start)} + 2px)`, width: `calc(${width(start, end)} - 4px)` }}
              >
                <span className="hidden font-bold tabular-nums sm:block">{appointment.startTime}</span>
                <span className="hidden truncate font-semibold sm:block">{clientName(appointment)}</span>
              </button>
            );
          })}
          {nowVisible && (
            <span aria-hidden className="absolute inset-y-0 z-[3] w-0.5 -translate-x-1/2 bg-ink" style={{ left: pct(now.minutes) }}>
              <span className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-ink" />
            </span>
          )}
        </div>
        <div ref={axisRef} aria-hidden className="relative mt-1.5 h-4">
          {/* Sólo para medir cuánto ocupa una hora escrita. */}
          <span ref={probeRef} className="invisible absolute text-[11px] tabular-nums">
            00:00
          </span>
          {/* Sólo las horas que caben sin quedar encima de otra ni de la de "ahora" (ver hoursThatFit). */}
          {hours
            .filter((minutes) => shownHours.has(minutes))
            .map((minutes) => (
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
