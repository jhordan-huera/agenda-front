import type { CSSProperties } from "react";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

/**
 * El calendario de la portada: la semana como en la Agenda del panel (vista «Semana»), con las citas
 * en los colores de su estado. Al cargar, entra la reserva nueva del jueves a las 10:00 (con
 * «reducir movimiento», ya está). Datos de ejemplo.
 */

/** En el celular sólo caben cuatro días: lunes y martes se ven desde tablet. */
const DAYS = [
  { short: "lun", date: 5, wide: true },
  { short: "mar", date: 6, wide: true },
  { short: "mié", date: 7 },
  { short: "jue", date: 8, today: true },
  { short: "vie", date: 9 },
  { short: "sáb", date: 10 },
];

const FIRST_HOUR = 8;
const HOURS = [8, 9, 10, 11, 12, 13, 14];
const ROW = 44;

type Block =
  | { day: number; start: number; length: number; name: string; status: AppointmentStatus }
  | { day: number; start: number; length: number; name: string; status: "new" }
  | { day: number; start: number; length: number; name: string; status: "blocked" };

const BLOCKS: Block[] = [
  { day: 0, start: 8, length: 1, name: "María L.", status: "completed" },
  { day: 0, start: 10, length: 1, name: "Carlos P.", status: "completed" },
  { day: 0, start: 13, length: 1, name: "Sofía M.", status: "completed" },
  { day: 1, start: 9, length: 1.5, name: "Ana T.", status: "completed" },
  { day: 1, start: 12, length: 1, name: "Diego S.", status: "no_show" },
  { day: 2, start: 8, length: 1, name: "Sofía M.", status: "completed" },
  { day: 2, start: 11, length: 1, name: "Daniel G.", status: "completed" },
  { day: 3, start: 8, length: 1, name: "María L.", status: "confirmed" },
  { day: 3, start: 9, length: 1, name: "Carlos P.", status: "pending" },
  { day: 3, start: 10, length: 1, name: "Ana T.", status: "new" },
  { day: 3, start: 12, length: 1, name: "Almuerzo", status: "blocked" },
  { day: 4, start: 8.5, length: 1, name: "Carlos P.", status: "confirmed" },
  { day: 4, start: 11, length: 1.5, name: "Sofía M.", status: "pending" },
  { day: 4, start: 13, length: 1, name: "Daniel G.", status: "confirmed" },
  { day: 5, start: 9, length: 1, name: "Diego S.", status: "confirmed" },
  { day: 5, start: 10.5, length: 1, name: "María L.", status: "pending" },
];

const LEGEND: AppointmentStatus[] = ["pending", "confirmed", "completed"];

const time = (hour: number) => `${String(Math.floor(hour)).padStart(2, "0")}:${hour % 1 ? "30" : "00"}`;

export function HeroCalendar() {
  return (
    <figure className="relative rounded-2xl border border-border/70 bg-card p-4 text-foreground shadow-[0_32px_64px_-32px_rgb(29_36_51/0.35)] animate-in fill-mode-both duration-700 fade-in slide-in-from-bottom-6 ease-out-soft motion-reduce:animate-none sm:p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-base font-bold">
          <span className="sm:hidden">7 – 10 de octubre</span>
          <span className="hidden sm:inline">5 – 10 de octubre</span>
        </span>
        {/* Las vistas de la Agenda, con «Semana» elegida (decorativo). */}
        <span aria-hidden className="flex rounded-lg bg-muted p-0.5 text-xs font-medium text-muted-foreground">
          <span className="px-2.5 py-1">Día</span>
          <span className="rounded-md bg-card px-2.5 py-1 font-semibold text-foreground shadow-sm">Semana</span>
          <span className="px-2.5 py-1">Mes</span>
        </span>
      </figcaption>
      <span className="sr-only">
        Ejemplo de una semana en la agenda, con las citas por estado: el jueves a las 10:00 entra una reserva nueva de Ana
        Torres.
      </span>

      <div aria-hidden className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {LEGEND.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", APPOINTMENT_STATUS_CONFIG[status].dot)} />
            {APPOINTMENT_STATUS_CONFIG[status].label}
          </span>
        ))}
      </div>

      <div
        aria-hidden
        className="mt-3 grid grid-cols-[2.4rem_repeat(4,minmax(0,1fr))] overflow-hidden rounded-xl border sm:grid-cols-[2.4rem_repeat(6,minmax(0,1fr))]"
      >
        <span className="border-b" />
        {DAYS.map((day) => (
          <span
            key={day.short}
            className={cn("border-b border-l py-1.5 text-center", day.today && "bg-accent/50", day.wide && "hidden sm:block")}
          >
            <span className={cn("block text-[11px]", day.today ? "font-semibold text-ink" : "text-muted-foreground")}>
              {day.short}
            </span>
            <span
              className={cn(
                "mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                day.today ? "bg-ink text-primary-foreground" : "text-foreground/80",
              )}
            >
              {day.date}
            </span>
          </span>
        ))}

        {/* Horas */}
        <div className="relative" style={{ height: (HOURS.length - 1) * ROW }}>
          {HOURS.slice(1, -1).map((hour, index) => (
            <span
              key={hour}
              className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
              style={{ top: (index + 1) * ROW }}
            >
              {time(hour)}
            </span>
          ))}
        </div>

        {DAYS.map((day, dayIndex) => (
          <div
            key={day.short}
            className={cn("relative border-l", day.today && "bg-accent/40", day.wide && "hidden sm:block")}
            style={{
              height: (HOURS.length - 1) * ROW,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--rule) 0 1px, transparent 1px ${ROW}px)`,
            }}
          >
            {BLOCKS.filter((block) => block.day === dayIndex).map((block) => (
              <span
                key={`${block.start}-${block.name}`}
                className={cn(
                  "absolute inset-x-0.5 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-[10.5px] leading-tight",
                  block.status === "blocked" && "bg-hatch border-l-0 text-muted-foreground",
                  block.status === "new" &&
                    "z-[1] border-ink bg-highlight text-foreground shadow-[0_6px_16px_-8px_rgb(29_36_51/0.45)] ring-2 ring-ink/25 animate-in fill-mode-both duration-500 zoom-in-90 fade-in motion-reduce:animate-none",
                  block.status !== "blocked" && block.status !== "new" && APPOINTMENT_STATUS_CONFIG[block.status].event,
                )}
                style={
                  {
                    top: (block.start - FIRST_HOUR) * ROW + 1,
                    height: block.length * ROW - 3,
                    ...(block.status === "new" ? { animationDelay: "1s" } : {}),
                  } as CSSProperties
                }
              >
                <span className="block truncate font-semibold">{block.name}</span>
                <span className="block truncate tabular-nums opacity-80">
                  {block.status === "new" ? "Nueva" : block.status === "blocked" ? "" : time(block.start)}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </figure>
  );
}
