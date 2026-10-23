import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
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
 * Cuántas horas se ven a la vez (spec 026): en el celular (una franja de menos de 640 px) y en el
 * computador. El resto del día queda a los lados, para deslizar. En el celular, además, cada hora mide
 * al menos 110 px: así una cita de 30 minutos lleva entera su hora («14:00») y el comienzo del nombre
 * (a 390 px se ven unas 2,9 horas; a 360, unas 2,6).
 */
const PHONE_WIDTH = 640;
const PHONE_HOURS = 3.5;
const PHONE_MIN_HOUR_PX = 110;
const DESKTOP_HOURS = 7;
/** Lo que avanzan ‹ y › (de lo que se ve) y a qué distancia del borde queda una cita al ir hasta ella. */
const PAGE_SHARE = 0.8;
const REVEAL_SHARE = 0.15;
/**
 * Desde qué ancho de franja cabe «citas» en los avisos de la barra, junto a ‹, «Ahora» y › (medido con
 * Sora: «← 12 citas» y «12 citas →»). «antes» y «más tarde» caben desde PHONE_WIDTH.
 */
const COUNT_WORD_WIDTH = 312;

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

/** Una cita de la franja, con su inicio y su final en minutos. */
type Slot = MinuteSpan & { appointment: Appointment };
type Side = "before" | "after";

/** Lo que se ve de la franja: el minuto de cada borde y si ya llegó a un extremo del día. */
interface View extends MinuteSpan {
  atStart: boolean;
  atEnd: boolean;
}

const sameView = (a: View, b: View) => a.start === b.start && a.end === b.end && a.atStart === b.atStart && a.atEnd === b.atEnd;

/** Desplazamiento suave, salvo para quien pidió menos movimiento. */
const scrollBehavior = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

/**
 * Dónde queda el borde izquierdo para ver una cita que va de `from` a `to` (px de la franja) en una
 * vista de `visible` px: hacia adelante ("after"), su inicio a un 15 % del borde izquierdo; hacia atrás,
 * su final a un 15 % del derecho. Así se ve también lo que sigue en esa dirección. Si con ese margen no
 * queda entera, lo justo para que quepa, y si es más larga que lo que se ve, desde su inicio (donde van
 * la hora y el nombre).
 */
function revealAt(from: number, to: number, side: Side, visible: number): number {
  if (to - from >= visible) return from;
  const margin = Math.min(REVEAL_SHARE * visible, visible - (to - from));
  return side === "after" ? from - margin : to - visible + margin;
}

/**
 * Dónde se abre la franja (el borde izquierdo, en px de una franja de `trackWidth`): durante el día,
 * centrada en "ahora"; antes, en la primera cita (o al inicio, si no hay); después, en la última (o al
 * final).
 */
function openingLeft(nowMinutes: number, bounds: MinuteSpan, slots: Slot[], x: (minutes: number) => number, visible: number, trackWidth: number) {
  if (nowMinutes > bounds.start && nowMinutes < bounds.end) return x(nowMinutes) - visible / 2;
  const early = nowMinutes <= bounds.start;
  const byStart = [...slots].sort((a, b) => a.start - b.start);
  const slot = early ? byStart[0] : byStart[byStart.length - 1];
  if (!slot) return early ? 0 : trackWidth - visible;
  return revealAt(x(slot.start), x(slot.end), "after", visible);
}

/**
 * El texto de un aviso de la barra: «2 citas antes» o «1 cita más tarde». En el celular no caben «antes»
 * ni «más tarde» (la flecha y el lado ya lo dicen) y, en uno muy angosto, tampoco «citas»; el lector de
 * pantalla lee siempre la frase entera.
 */
function EdgeCount({ count, side, width }: { count: number; side: Side; width: number }) {
  return (
    <span className="truncate">
      {count}
      <span className={cn(width < COUNT_WORD_WIDTH && "sr-only")}> {count === 1 ? "cita" : "citas"}</span>
      <span className={cn(width < PHONE_WIDTH && "sr-only")}> {side === "before" ? "antes" : "más tarde"}</span>
    </span>
  );
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
 * El día en una franja: horario de atención (papel), fuera de horario (niebla), bloqueos (rayado), las
 * citas con el color de su estado y la línea de "ahora". Lo ya pasado queda atenuado; la siguiente cita
 * lleva el anillo del resaltado. Se ven unas horas a la vez y el resto se desliza (spec 026), con ‹ ›,
 * «Ahora» y los avisos de las citas que quedan a los lados.
 */
export function DayRibbon({ bounds, now, appointments, schedules, blockedTimes, nextId, clientName, onOpen }: DayRibbonProps) {
  const span = bounds.end - bounds.start;
  const pct = (minutes: number) => `${((Math.min(Math.max(minutes, bounds.start), bounds.end) - bounds.start) / span) * 100}%`;
  const width = (from: number, to: number) => `${((Math.min(to, bounds.end) - Math.max(from, bounds.start)) / span) * 100}%`;
  const hours = Array.from({ length: span / 60 + 1 }, (_, i) => bounds.start + i * 60);
  const nowVisible = now.minutes > bounds.start && now.minutes < bounds.end;
  const slots: Slot[] = appointments.map((appointment) => ({
    appointment,
    start: timeToMinutes(appointment.startTime),
    end: timeToMinutes(appointment.endTime),
  }));
  // Lo que se ve de la franja (`viewport`, el ancho de la tarjeta), las horas que caben debajo según
  // el ancho real del eje (el de toda la franja, que se desliza) y lo que mide una hora escrita en este
  // dispositivo (se vuelve a medir cuando carga la letra). Cambian al girar el móvil o al redimensionar
  // la ventana. Se mide antes de pintar, para no mostrar un cuadro con el día entero comprimido.
  const frameRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [viewport, setViewport] = useState(0);
  const [axisWidth, setAxisWidth] = useState(300);
  const [textWidth, setTextWidth] = useState(32);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const axis = axisRef.current;
    const probe = probeRef.current;
    if (!frame || !axis || !probe) return;
    const measure = () => {
      setViewport(frame.getBoundingClientRect().width);
      setAxisWidth(axis.getBoundingClientRect().width || 300);
      setTextWidth(probe.getBoundingClientRect().width || 32);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(axis);
    let active = true;
    void document.fonts?.ready.then(() => active && measure());
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);
  const shownHours = hoursThatFit(hours, bounds, nowVisible ? now.minutes : null, axisWidth, textWidth);

  // El ancho de la franja: el que hace falta para ver PHONE_HOURS o DESKTOP_HOURS a la vez. Un día que
  // cabe entero no se desliza (ni lleva la barra de arriba).
  const hoursInView = viewport < PHONE_WIDTH ? Math.min(PHONE_HOURS, Math.max(1, viewport / PHONE_MIN_HOUR_PX)) : DESKTOP_HOURS;
  const trackWidth = Math.max(viewport, ((span / 60) * viewport) / hoursInView);
  const scrollable = viewport > 0 && span / 60 > hoursInView;
  const x = (minutes: number) => ((minutes - bounds.start) / span) * trackWidth;

  const scrollRef = useRef<HTMLDivElement>(null);
  const centered = useRef(false);
  // El minuto del borde izquierdo la última vez que se miró: al cambiar el ancho, se vuelve a él.
  const leftMinute = useRef<number | null>(null);
  const [view, setView] = useState<View | null>(null);

  // Lee qué parte del día se ve. El estado sólo cambia si cambia algo (en minutos enteros), para no
  // repintar con cada píxel.
  const readView = useCallback(() => {
    const element = scrollRef.current;
    if (!element || !viewport) return;
    const left = element.scrollLeft;
    const minuteAt = (px: number) => bounds.start + (px / trackWidth) * span;
    if (trackWidth > viewport) leftMinute.current = minuteAt(left);
    const next: View = {
      start: Math.round(minuteAt(left)),
      end: Math.round(minuteAt(left + viewport)),
      // Con 1 px de margen: el desplazamiento puede quedar en fracciones de píxel.
      atStart: left <= 1,
      atEnd: left >= element.scrollWidth - element.clientWidth - 1,
    };
    setView((current) => (current && sameView(current, next) ? current : next));
  }, [bounds.start, span, trackWidth, viewport]);

  // Al deslizar, a lo sumo una lectura por cuadro; el oyente es pasivo, así que no frena el gesto.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    let pending = 0;
    const onScroll = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        readView();
      });
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(pending);
    };
  }, [readView]);

  // Dónde empieza (ver openingLeft), sólo la primera vez que se puede deslizar: después no se mueve
  // sola mientras la persona la desliza, aunque avance la hora. Va antes de pintar, así no se ve el salto.
  const startLeft = scrollable ? openingLeft(now.minutes, bounds, slots, x, viewport, trackWidth) : 0;
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !scrollable || centered.current) return;
    centered.current = true;
    element.scrollLeft = startLeft;
    readView();
  }, [scrollable, startLeft, readView]);

  // Cuando cambia el ancho (girar el móvil, la ventana) o el día, vuelve al minuto que se veía en el
  // borde izquierdo, para no saltar de hora. Con la hora o las citas no se mueve.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (scrollable && leftMinute.current !== null) {
      element.scrollLeft = ((leftMinute.current - bounds.start) / span) * trackWidth;
    }
    readView();
  }, [scrollable, bounds.start, span, trackWidth, readView]);

  // Las citas que quedan enteras fuera de lo que se ve: antes, las que terminan antes del borde
  // izquierdo; después, las que empiezan después del derecho. Los avisos llevan a la más cercana.
  const before = view ? slots.filter((slot) => slot.end <= view.start) : [];
  const after = view ? slots.filter((slot) => slot.start >= view.end) : [];
  const previous = before.reduce<Slot | null>((nearest, slot) => (!nearest || slot.end > nearest.end ? slot : nearest), null);
  const following = after.reduce<Slot | null>((nearest, slot) => (!nearest || slot.start < nearest.start ? slot : nearest), null);

  const scrollPage = (direction: -1 | 1) =>
    scrollRef.current?.scrollBy({ left: direction * PAGE_SHARE * viewport, behavior: scrollBehavior() });
  const scrollToNow = () => scrollRef.current?.scrollTo({ left: x(now.minutes) - viewport / 2, behavior: scrollBehavior() });
  const scrollToSlot = (slot: Slot, side: Side, event: MouseEvent<HTMLButtonElement>) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ left: revealAt(x(slot.start), x(slot.end), side, viewport), behavior: scrollBehavior() });
    // Con el teclado (un clic sin puntero), el foco pasa a la cita: el aviso puede desaparecer al
    // llegar, y así el lector de pantalla la anuncia.
    if (event.detail === 0) {
      element.querySelector<HTMLElement>(`[data-appointment-id="${slot.appointment.id}"]`)?.focus({ preventScroll: true });
    }
  };

  return (
    <div ref={frameRef}>
      {scrollable && (
        // ‹ y el aviso de antes a la izquierda, «Ahora» al centro, y el de después y › a la derecha. A
        // 390 px cabe sin desbordar: los avisos se acortan (ver EdgeCount) y, si aun así faltara sitio,
        // se cortan con puntos suspensivos.
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
          <div className="flex min-w-0 items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Horas anteriores" disabled={view?.atStart} onClick={() => scrollPage(-1)}>
              <ChevronLeft />
            </Button>
            {previous && (
              <Button variant="secondary" size="sm" className="min-w-0 shrink" onClick={(event) => scrollToSlot(previous, "before", event)}>
                <ArrowLeft data-icon="inline-start" />
                <EdgeCount count={before.length} side="before" width={viewport} />
              </Button>
            )}
          </div>
          {nowVisible && (
            <Button variant="outline" size="sm" aria-label="Ahora: volver a la hora actual" onClick={scrollToNow}>
              Ahora
            </Button>
          )}
          <div className="col-start-3 flex min-w-0 items-center justify-end gap-1">
            {following && (
              <Button variant="secondary" size="sm" className="min-w-0 shrink" onClick={(event) => scrollToSlot(following, "after", event)}>
                <EdgeCount count={after.length} side="after" width={viewport} />
                <ArrowRight data-icon="inline-end" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" aria-label="Horas siguientes" disabled={view?.atEnd} onClick={() => scrollPage(1)}>
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
      {/* Sólo se desliza la franja, nunca la página. `overscroll-x-contain`: al llegar a un extremo con
          el trackpad, el gesto no pasa a la página (ni la manda atrás en el historial). */}
      <div
        ref={scrollRef}
        role="region"
        aria-label={`Tu día, de ${minutesToTime(bounds.start)} a ${minutesToTime(bounds.end)}`}
        className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1"
      >
        <div className="relative" style={scrollable ? { width: trackWidth } : undefined}>
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
            {slots.map(({ appointment, start, end }) => {
              const past = end <= now.minutes;
              return (
                <button
                  key={appointment.id}
                  type="button"
                  data-appointment-id={appointment.id}
                  onClick={() => onOpen(appointment)}
                  aria-label={`${appointment.startTime}, ${clientName(appointment)}, ${APPOINTMENT_STATUS_CONFIG[appointment.status].label}`}
                  className={cn(
                    "absolute inset-y-2.5 z-[2] overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    APPOINTMENT_STATUS_CONFIG[appointment.status].event,
                    past && "opacity-60",
                    appointment.id === nextId && "ring-2 ring-highlight ring-offset-1",
                  )}
                  style={{ left: `calc(${pct(start)} + 2px)`, width: `calc(${width(start, end)} - 4px)` }}
                >
                  {/* La hora entera arriba (en una cita muy corta, recortada) y el nombre debajo, cortado si no cabe. */}
                  <span className="block font-bold whitespace-nowrap tabular-nums">{appointment.startTime}</span>
                  <span className="block truncate font-semibold">{clientName(appointment)}</span>
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
                className="absolute -translate-x-1/2 rounded bg-ink px-1 text-[11px] font-bold text-primary-foreground tabular-nums"
                style={{ left: pct(now.minutes) }}
              >
                {minutesToTime(now.minutes)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
