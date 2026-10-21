import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * La semana del panel del acceso (spec 030): la Agenda en su vista «Semana», de lunes a viernes, en una sola
 * gama, el azul de la marca y sus grises (sin los colores de cada estado, que aquí se verían como
 * confeti): lo atendido en gris, lo confirmado en azul claro, lo pendiente con el borde punteado y la
 * reserva que acaba de entrar en el azul lleno, lo único que destaca. Al cargar, entra esa reserva (con
 * «reducir movimiento», ya está). Datos de ejemplo; el texto para el lector de pantalla lo pone quien la usa.
 */

const DAYS = [
  { short: "lun", date: 5 },
  { short: "mar", date: 6 },
  { short: "mié", date: 7 },
  { short: "jue", date: 8, today: true },
  { short: "vie", date: 9 },
];

const FIRST_HOUR = 8;
const HOURS = [8, 9, 10, 11, 12, 13, 14];
const ROW = 44;
/** Cuándo entra la reserva nueva (segundos desde que carga); el aviso del panel llega justo después. */
export const ARRIVAL_DELAY = 0.8;

type Kind = "done" | "confirmed" | "pending" | "new" | "blocked";

const KIND_STYLE: Record<Exclude<Kind, "blocked">, string> = {
  done: "border-l-[3px] border-muted-foreground/35 bg-muted text-muted-foreground",
  confirmed: "border-l-[3px] border-ink bg-accent text-foreground",
  pending: "border border-dashed border-ink/45 bg-card text-foreground",
  new: "z-[1] bg-ink text-primary-foreground shadow-[0_8px_18px_-8px_rgb(29_36_51/0.5)] animate-in fill-mode-both duration-500 zoom-in-90 fade-in motion-reduce:animate-none",
};

/** La leyenda, con una muestra chica de cada bloque (el borde entero: la barra de 3 px no se lee en 10 px). */
const LEGEND = [
  { swatch: "border border-ink bg-accent", label: "Confirmada" },
  { swatch: "border border-dashed border-ink/60", label: "Pendiente" },
  { swatch: "border border-muted-foreground/35 bg-muted", label: "Atendida" },
];

const BLOCKS: { day: number; start: number; length: number; name: string; kind: Kind }[] = [
  { day: 0, start: 8, length: 1, name: "María L.", kind: "done" },
  { day: 0, start: 10, length: 1, name: "Carlos P.", kind: "done" },
  { day: 0, start: 13, length: 1, name: "Sofía M.", kind: "done" },
  { day: 1, start: 9, length: 1.5, name: "Ana T.", kind: "done" },
  { day: 1, start: 12, length: 1, name: "Diego S.", kind: "done" },
  { day: 2, start: 8, length: 1, name: "Sofía M.", kind: "done" },
  { day: 2, start: 11, length: 1, name: "Daniel G.", kind: "done" },
  { day: 3, start: 8, length: 1, name: "María L.", kind: "confirmed" },
  { day: 3, start: 9, length: 1, name: "Carlos P.", kind: "pending" },
  { day: 3, start: 10, length: 1, name: "Ana T.", kind: "new" },
  { day: 3, start: 12, length: 1, name: "Almuerzo", kind: "blocked" },
  { day: 4, start: 8.5, length: 1, name: "Carlos P.", kind: "confirmed" },
  { day: 4, start: 11, length: 1.5, name: "Sofía M.", kind: "pending" },
  { day: 4, start: 13, length: 1, name: "Daniel G.", kind: "confirmed" },
];

const time = (hour: number) => `${String(Math.floor(hour)).padStart(2, "0")}:${hour % 1 ? "30" : "00"}`;

export function WeekSample({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("rounded-2xl bg-card p-5 text-card-foreground shadow-lifted", className)}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-base font-bold">5 – 9 de octubre</span>
        {/* Las vistas de la Agenda, con «Semana» elegida (decorativo). */}
        <span className="flex rounded-lg bg-muted p-0.5 text-xs font-medium text-muted-foreground">
          <span className="px-2.5 py-1">Día</span>
          <span className="rounded-md bg-card px-2.5 py-1 font-semibold text-foreground shadow-sm">Semana</span>
          <span className="px-2.5 py-1">Mes</span>
        </span>
      </div>

      <div className="mt-3 flex gap-x-4 text-[11px] text-muted-foreground">
        {LEGEND.map(({ swatch, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-[3px]", swatch)} />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[2.4rem_repeat(5,minmax(0,1fr))] overflow-hidden rounded-xl border">
        <span className="border-b" />
        {DAYS.map((day) => (
          <span key={day.short} className={cn("border-b border-l py-1.5 text-center", day.today && "bg-accent/50")}>
            <span className={cn("block text-[11px]", day.today ? "font-semibold text-ink" : "text-muted-foreground")}>{day.short}</span>
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
            className={cn("relative border-l", day.today && "bg-accent/30")}
            style={{
              height: (HOURS.length - 1) * ROW,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--rule) 0 1px, transparent 1px ${ROW}px)`,
            }}
          >
            {BLOCKS.filter((block) => block.day === dayIndex).map((block) => (
              <span
                key={`${block.start}-${block.name}`}
                className={cn(
                  "absolute inset-x-0.5 overflow-hidden rounded-md px-1.5 py-1 text-[10.5px] leading-tight",
                  block.kind === "blocked" ? "bg-hatch text-muted-foreground" : KIND_STYLE[block.kind],
                )}
                style={
                  {
                    top: (block.start - FIRST_HOUR) * ROW + 1,
                    height: block.length * ROW - 3,
                    ...(block.kind === "new" ? { animationDelay: `${ARRIVAL_DELAY}s` } : {}),
                  } as CSSProperties
                }
              >
                <span className="block truncate font-semibold">{block.name}</span>
                <span className="block truncate tabular-nums opacity-80">
                  {block.kind === "new" ? "Nueva" : block.kind === "blocked" ? "" : time(block.start)}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
