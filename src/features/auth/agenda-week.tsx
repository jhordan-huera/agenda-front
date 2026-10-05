import { cn } from "@/lib/utils";

/**
 * La semana del profesional como en su agenda (vista "Semana"), para el inicio de sesión.
 * La reserva que acaba de entrar va marcada con el resaltador; hoy, también.
 */

const DAYS = [
  { short: "Lun", date: 5 },
  { short: "Mar", date: 6 },
  { short: "Mié", date: 7 },
  { short: "Jue", date: 8, today: true },
  { short: "Vie", date: 9 },
  { short: "Sáb", date: 10 },
];

const FIRST_HOUR = 8;
const HOURS = [8, 9, 10, 11, 12, 13];
const ROW = 46;

type Block = { day: number; start: number; length: number; label: string; kind?: "new" | "blocked" };

const BLOCKS: Block[] = [
  { day: 0, start: 8, length: 1, label: "María L." },
  { day: 0, start: 10, length: 1, label: "Carlos P." },
  { day: 1, start: 9, length: 1.5, label: "Ana T." },
  { day: 1, start: 12, length: 1, label: "Diego S." },
  { day: 2, start: 8, length: 1, label: "Sofía M." },
  { day: 2, start: 11, length: 1, label: "Daniel G." },
  { day: 3, start: 9, length: 1, label: "María L." },
  { day: 3, start: 10, length: 1, label: "Ana T.", kind: "new" },
  { day: 3, start: 13, length: 1, label: "Almuerzo", kind: "blocked" },
  { day: 4, start: 8.5, length: 1, label: "Carlos P." },
  { day: 4, start: 11, length: 1.5, label: "Sofía M." },
  { day: 5, start: 9, length: 1, label: "Diego S." },
];

export function AgendaWeek() {
  return (
    <figure className="rounded-2xl border bg-background p-5 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-lg font-bold">Semana del 5 al 10 de octubre</span>
        <span className="text-sm text-muted-foreground">11 citas</span>
      </figcaption>
      <span className="sr-only">
        Ejemplo de una semana en la agenda: el jueves a las 10:00 entra una reserva nueva de Ana Torres.
      </span>

      <div aria-hidden className="mt-5 grid grid-cols-[2.25rem_repeat(6,minmax(0,1fr))]">
        <span />
        {DAYS.map((day) => (
          <span key={day.short} className="pb-2 text-center">
            <span className={cn("block text-xs", day.today ? "font-semibold text-ink" : "text-muted-foreground")}>
              {day.short}
            </span>
            <span
              className={cn(
                "mt-0.5 inline-block text-lg leading-tight font-bold tabular-nums",
                day.today ? "marker text-ink" : "text-foreground/80",
              )}
            >
              {day.date}
            </span>
          </span>
        ))}

        {/* Horas */}
        <div className="relative" style={{ height: HOURS.length * ROW }}>
          {HOURS.map((hour, index) => (
            <span
              key={hour}
              className="absolute -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
              style={{ top: index * ROW }}
            >
              {index === 0 ? "" : `${String(hour).padStart(2, "0")}:00`}
            </span>
          ))}
        </div>

        {DAYS.map((day, dayIndex) => (
          <div
            key={day.short}
            className={cn("relative border-l", day.today && "bg-accent/40")}
            style={{
              height: HOURS.length * ROW,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--rule) 0 1px, transparent 1px ${ROW}px)`,
            }}
          >
            {BLOCKS.filter((block) => block.day === dayIndex).map((block) => (
              <span
                key={`${block.start}-${block.label}`}
                className={cn(
                  "absolute inset-x-0.5 overflow-hidden rounded-[5px] px-1.5 py-1 text-[11px] leading-tight font-semibold",
                  !block.kind && "border-l-2 border-ink bg-accent text-ink",
                  block.kind === "blocked" && "bg-hatch text-muted-foreground",
                  block.kind === "new" && "marker marker-sweep text-foreground [--marker-delay:0.9s]",
                )}
                style={{ top: (block.start - FIRST_HOUR) * ROW + 1, height: block.length * ROW - 3 }}
              >
                <span className="block truncate">{block.label}</span>
                {block.kind === "new" && <span className="block truncate font-normal">Nueva</span>}
              </span>
            ))}
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        Ana Torres reservó el jueves a las 10:00 desde tu página. Ya está en tu agenda.
      </p>
    </figure>
  );
}
