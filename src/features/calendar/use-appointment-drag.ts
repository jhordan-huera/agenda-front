import { useEffect, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { durationInMinutes, timeToMinutes } from "@/lib/time";
import type { Appointment, ISODate } from "@/types";

/** Dónde caería la cita: columna, fecha, agenda y minutos de inicio y fin. */
export interface DropTarget {
  columnKey: string;
  date: ISODate;
  professionalId: string;
  start: number;
  end: number;
  /** Por qué no se puede soltar ahí (hora pasada, ocupada…); null: se puede. */
  problem: string | null;
}

export interface DragColumn {
  key: string;
  day: ISODate;
  professionalId?: string;
}

interface Gesture {
  appointment: Appointment;
  pointerId: number;
  startX: number;
  startY: number;
  /** Minutos entre el inicio de la cita y el punto donde se agarró. */
  grabOffset: number;
  active: boolean;
  longPress: ReturnType<typeof setTimeout> | null;
  target: DropTarget | null;
}

/** Encaje al arrastrar, en minutos. */
const SNAP_MINUTES = 15;
/** Con el ratón, el arrastre empieza tras moverse unos píxeles (si no, es un clic). */
const MOUSE_THRESHOLD = 5;
/** En pantallas táctiles se mantiene el dedo quieto este tiempo; antes, mover el dedo desplaza la agenda. */
const LONG_PRESS_MS = 450;
const TOUCH_SLOP = 8;
/** Cerca del borde del área de la agenda, se desplaza sola. */
const EDGE = 48;

interface DragOptions {
  scrollRef: RefObject<HTMLDivElement | null>;
  bodyRef: RefObject<HTMLDivElement | null>;
  columns: DragColumn[];
  startHour: number;
  endHour: number;
  hourHeight: number;
  /** Problema de soltar la cita ahí, o null si se puede. */
  checkDrop: (appointment: Appointment, target: Omit<DropTarget, "problem" | "columnKey">) => string | null;
  onDrop: (appointment: Appointment, target: DropTarget) => void;
  onRejected: (problem: string) => void;
}

/**
 * Arrastrar una cita en la rejilla de la agenda (vistas Día y Semana) con el ratón o, en el móvil,
 * manteniendo el dedo sobre ella. Mientras se arrastra, `dragging` dice qué cita y dónde caería.
 */
export function useAppointmentDrag(options: DragOptions) {
  const [dragging, setDragging] = useState<{ appointmentId: string; target: DropTarget | null } | null>(null);
  // Los oyentes de la ventana se crean una sola vez (así se pueden quitar) y leen las opciones del
  // último render.
  const [drag] = useState(() => createDrag(options, setDragging));
  useEffect(() => drag.setOptions(options));

  // Mientras se arrastra con el dedo, la página no se desplaza (los oyentes de React son pasivos).
  useEffect(() => {
    const scroller = options.scrollRef.current;
    if (!scroller) return;
    const block = (event: TouchEvent) => {
      if (drag.isActive()) event.preventDefault();
    };
    scroller.addEventListener("touchmove", block, { passive: false });
    return () => scroller.removeEventListener("touchmove", block);
  }, [options.scrollRef, drag]);

  useEffect(() => () => drag.cancel(), [drag]);

  return { dragging, startDrag: drag.start, isClickSuppressed: drag.isClickSuppressed };
}

type SetDragging = (value: { appointmentId: string; target: DropTarget | null } | null) => void;

function createDrag(initialOptions: DragOptions, setDragging: SetDragging) {
  let options = initialOptions;
  const getOptions = () => options;
  let gesture: Gesture | null = null;
  // Tras soltar, el clic que llega a la cita no abre su ficha.
  let suppressClickUntil = 0;

  const targetAt = (clientX: number, clientY: number, g: Gesture): DropTarget | null => {
    const { bodyRef, columns, startHour, endHour, hourHeight, checkDrop } = getOptions();
    const body = bodyRef.current;
    if (!body || columns.length === 0) return null;
    const rect = body.getBoundingClientRect();
    const gutter = (body.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 56;
    const columnWidth = (rect.width - gutter) / columns.length;
    const index = Math.min(columns.length - 1, Math.max(0, Math.floor((clientX - rect.left - gutter) / columnWidth)));
    const column = columns[index];
    const duration = durationInMinutes(g.appointment.startTime, g.appointment.endTime);
    const pointer = startHour * 60 + ((clientY - rect.top) / hourHeight) * 60;
    const snapped = Math.round((pointer - g.grabOffset) / SNAP_MINUTES) * SNAP_MINUTES;
    const start = Math.min(Math.max(snapped, startHour * 60), endHour * 60 - duration);
    const place = { date: column.day, professionalId: column.professionalId ?? g.appointment.professionalId, start, end: start + duration };
    return { ...place, columnKey: column.key, problem: checkDrop(g.appointment, place) };
  };

  const autoScroll = (clientX: number, clientY: number) => {
    const scroller = getOptions().scrollRef.current;
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    if (clientY < rect.top + EDGE) scroller.scrollTop -= 14;
    else if (clientY > rect.bottom - EDGE) scroller.scrollTop += 14;
    if (clientX < rect.left + EDGE) scroller.scrollLeft -= 14;
    else if (clientX > rect.right - EDGE) scroller.scrollLeft += 14;
  };

  const activate = (g: Gesture, clientX: number, clientY: number) => {
    g.active = true;
    g.target = targetAt(clientX, clientY, g);
    setDragging({ appointmentId: g.appointment.id, target: g.target });
  };

  const finish = (drop: boolean) => {
    const g = gesture;
    gesture = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onKey);
    if (!g) return;
    if (g.longPress) clearTimeout(g.longPress);
    if (!g.active) return;
    suppressClickUntil = Date.now() + 400;
    setDragging(null);
    const target = g.target;
    const moved =
      target &&
      (target.date !== g.appointment.date ||
        target.start !== timeToMinutes(g.appointment.startTime) ||
        target.professionalId !== g.appointment.professionalId);
    if (!drop || !target || !moved) return;
    if (target.problem) getOptions().onRejected(target.problem);
    else getOptions().onDrop(g.appointment, target);
  };

  function onMove(event: PointerEvent) {
    const g = gesture;
    if (!g || event.pointerId !== g.pointerId) return;
    if (!g.active) {
      const distance = Math.hypot(event.clientX - g.startX, event.clientY - g.startY);
      if (event.pointerType === "mouse") {
        if (distance >= MOUSE_THRESHOLD) activate(g, event.clientX, event.clientY);
      } else if (distance > TOUCH_SLOP) {
        // Movió el dedo antes de tiempo: es un desplazamiento de la agenda, no un arrastre.
        finish(false);
      }
      return;
    }
    autoScroll(event.clientX, event.clientY);
    const target = targetAt(event.clientX, event.clientY, g);
    if (target?.columnKey !== g.target?.columnKey || target?.start !== g.target?.start || target?.problem !== g.target?.problem) {
      g.target = target;
      setDragging({ appointmentId: g.appointment.id, target });
    }
  }

  function onUp(event: PointerEvent) {
    if (event.pointerId === gesture?.pointerId) finish(true);
  }

  function onCancel(event: PointerEvent) {
    if (event.pointerId === gesture?.pointerId) finish(false);
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape") finish(false);
  }

  return {
    setOptions: (next: DragOptions) => {
      options = next;
    },
    isActive: () => Boolean(gesture?.active),
    /** true si el clic de la cita viene de soltarla (no debe abrir su ficha). */
    isClickSuppressed: () => Date.now() < suppressClickUntil,
    cancel: () => finish(false),
    /** Para el onPointerDown de cada cita que se puede mover. */
    start(event: ReactPointerEvent<HTMLElement>, appointment: Appointment) {
      if (gesture || (event.pointerType === "mouse" && event.button !== 0)) return;
      const { bodyRef, startHour, hourHeight } = getOptions();
      const rect = bodyRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pointer = startHour * 60 + ((event.clientY - rect.top) / hourHeight) * 60;
      const g: Gesture = {
        appointment,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        grabOffset: pointer - timeToMinutes(appointment.startTime),
        active: false,
        longPress: null,
        target: null,
      };
      gesture = g;
      if (event.pointerType !== "mouse") {
        const { clientX, clientY } = event;
        g.longPress = setTimeout(() => {
          if (gesture !== g) return;
          navigator.vibrate?.(15);
          activate(g, clientX, clientY);
        }, LONG_PRESS_MS);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey);
    },
  };
}
