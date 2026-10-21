import { BellRing, CircleCheck, ReceiptText, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { SCENE } from "./landing-constants";
import { Sheet } from "./sheet";

/**
 * «Tu día» de la portada (spec 030): la franja del Inicio (features/dashboard/day-ribbon.tsx), estática,
 * con la cita que acaba de llegar y, debajo, los avisos que traen las citas, con los textos de
 * lib/notices.ts. En el celular se ve de 10:00 a 14:00 y, desde tablet, el horario entero (de 08:00 a 17:00):
 * cada cita se coloca con --from y --span, así la misma lista sirve para los dos anchos. Las horas libres
 * que quedan (11:00, 14:00 y 16:00) son las que ofrece la página de reservas de BookingSample. Datos de
 * ejemplo; el texto para el lector de pantalla lo pone quien la usa.
 */

/** Las 10:40, en horas. */
const NOW = 10 + 40 / 60;
const LUNCH = { start: 13, end: 14 };
const LENGTH = 50 / 60;

type SlotKind = "done" | "new" | "booked";
const SLOTS: { start: number; name: string; kind: SlotKind }[] = [
  { start: 8, name: "María", kind: "done" },
  { start: 9, name: "Jorge", kind: "done" },
  { start: 11, name: "Ana", kind: "new" },
  { start: 12, name: "Carlos", kind: "booked" },
  { start: 15, name: "Lucía", kind: "booked" },
];

/** Las horas escritas bajo la franja: sin las que quedarían encima de la de «ahora» (como en el Inicio). */
const PHONE_HOURS = [12, 13];
const WIDE_HOURS = [9, 10, 12, 13, 14, 15, 16];

const NOTICES: {
  icon: LucideIcon;
  tone: string;
  title: string;
  body: string;
  when: string;
  arriving?: boolean;
}[] = [
  {
    icon: BellRing,
    tone: "bg-accent text-ink",
    title: "Nueva reserva",
    body: "Hoy 11:00 · Consulta psicológica · Ana T.",
    when: "ahora",
    arriving: true,
  },
  {
    icon: CircleCheck,
    tone: "bg-confirmed/10 text-confirmed",
    title: "El paciente confirmó",
    body: "Hoy 12:00 · Carlos P.",
    when: "hace 12 min",
  },
  {
    icon: ReceiptText,
    tone: "bg-muted text-muted-foreground",
    title: "Comprobante de pago",
    body: "Lucía M. · Hoy 15:00",
    when: "hace 25 min",
  },
];

const clock = (hour: number) =>
  `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`;
/** Dónde cae una hora en la franja que se ve (de --from, a lo largo de --span horas). */
const at = (hour: number) => `calc((${hour} - var(--from)) / var(--span) * 100%)`;
const across = (from: number, to: number) => `calc(${to - from} / var(--span) * 100%)`;

export function DaySample({ className }: { className?: string }) {
  return (
    <Sheet aria-hidden className={cn("p-4 sm:p-6", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold">Tu día</p>
        <p className="text-sm text-muted-foreground">Jueves 8 de octubre</p>
      </div>

      <div className="mt-4 [--from:10] [--span:4] md:[--from:8] md:[--span:9]">
        <div className="relative h-[4.5rem] overflow-hidden rounded-xl bg-card ring-1 ring-border">
          <span
            className="bg-hatch absolute inset-y-0 flex items-end px-1.5 pb-1 text-[11px] text-muted-foreground"
            style={{
              left: at(LUNCH.start),
              width: across(LUNCH.start, LUNCH.end),
            }}
          >
            Almuerzo
          </span>
          {/* Lo que ya pasó, atenuado. */}
          <span className="absolute inset-y-0 left-0 z-[1] bg-foreground/[0.035]" style={{ width: at(NOW) }} />
          {SLOTS.map((slot) => (
            <span
              key={slot.start}
              className={cn(
                "absolute inset-y-2 z-[2] overflow-hidden rounded-md border-l-[3px] border-ink px-1.5 py-1 text-[11px] leading-tight",
                slot.kind === "new"
                  ? "bg-card ring-2 ring-ink/30 animate-in fill-mode-both duration-500 fade-in slide-in-from-bottom-1 ease-out-soft motion-reduce:animate-none"
                  : "bg-accent",
                slot.kind === "done" && "opacity-60",
              )}
              style={{
                left: `calc(${at(slot.start)} + 2px)`,
                width: `calc(${across(slot.start, slot.start + LENGTH)} - 4px)`,
                ...(slot.kind === "new" ? { animationDelay: `${SCENE.arrive}s` } : {}),
              }}
            >
              <span className="block font-bold tabular-nums">
                {slot.kind === "new" ? (
                  <span
                    className="marker marker-draw"
                    style={
                      {
                        "--marker-delay": `${SCENE.arrive + 0.2}s`,
                      } as CSSProperties
                    }
                  >
                    {clock(slot.start)}
                  </span>
                ) : (
                  clock(slot.start)
                )}
              </span>
              <span className="block truncate font-semibold">{slot.name}</span>
            </span>
          ))}
          <span className="absolute inset-y-0 z-[3] w-0.5 -translate-x-1/2 bg-ink" style={{ left: at(NOW) }}>
            <span className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-ink" />
          </span>
        </div>

        <div className="relative mt-1.5 h-4 text-[11px] text-muted-foreground tabular-nums">
          {PHONE_HOURS.map((hour) => (
            <span
              key={hour}
              className="absolute -translate-x-1/2 md:hidden"
              style={{ left: `${((hour - 10) / 4) * 100}%` }}
            >
              {clock(hour)}
            </span>
          ))}
          {WIDE_HOURS.map((hour) => (
            <span
              key={hour}
              className="absolute hidden -translate-x-1/2 md:block"
              style={{ left: `${((hour - 8) / 9) * 100}%` }}
            >
              {clock(hour)}
            </span>
          ))}
          <span
            className="absolute -translate-x-1/2 rounded bg-ink px-1 font-bold text-primary-foreground"
            style={{ left: at(NOW) }}
          >
            {clock(NOW)}
          </span>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {NOTICES.map(({ icon: Icon, tone, title, body, when, arriving }) => (
          <li
            key={title}
            className={cn(
              "flex items-center gap-3 py-3 last:pb-0",
              arriving &&
                "animate-in fill-mode-both duration-500 fade-in slide-in-from-bottom-1 ease-out-soft motion-reduce:animate-none",
            )}
            style={arriving ? { animationDelay: `${SCENE.notice}s` } : undefined}
          >
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-[13px] text-muted-foreground">{body}</span>
            </span>
            <span className="shrink-0 self-start pt-0.5 text-xs text-muted-foreground">{when}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
