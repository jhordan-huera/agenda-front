import { BellRing } from "lucide-react";
import type { CSSProperties } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

/**
 * La hoja del día sobre la tapa de la agenda. Al cargar la página ocurre una sola escena:
 * llega el aviso de una reserva online, la hora de las 10:00 deja de estar libre y el
 * resaltador la marca. Con "reducir movimiento" se muestra directamente el resultado.
 */

type Row =
  | { time: string; kind: "booked"; name: string; service: string; status: AppointmentStatus }
  | { time: string; kind: "new"; name: string; service: string }
  | { time: string; kind: "free" }
  | { time: string; kind: "blocked"; reason: string };

const DAY: Row[] = [
  { time: "08:00", kind: "booked", name: "María López", service: "Consulta inicial", status: "confirmed" },
  { time: "09:00", kind: "booked", name: "Carlos Pérez", service: "Seguimiento", status: "pending" },
  { time: "10:00", kind: "new", name: "Ana Torres", service: "Evaluación" },
  { time: "11:00", kind: "free" },
  { time: "12:00", kind: "blocked", reason: "Almuerzo" },
  { time: "13:00", kind: "booked", name: "Daniel Gómez", service: "Visita a domicilio", status: "confirmed" },
];

/** Momentos de la escena (segundos desde que carga la página). */
const SCENE = { sheet: 0.1, notice: 1, mark: 1.6, details: 1.8 };

const delay = (seconds: number) => ({ animationDelay: `${seconds}s` });

export function HeroAgenda() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* La hoja de atrás: la agenda tiene más páginas. */}
      <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rotate-3 rounded-2xl bg-background/60 ring-1 ring-ink/10" />

      <figure
        className="relative -rotate-[1.5deg] rounded-2xl bg-white p-5 text-foreground shadow-[0_32px_64px_-32px_rgb(29_36_51/0.35)] animate-in fill-mode-both duration-700 fade-in slide-in-from-bottom-6 ease-out-soft motion-reduce:animate-none sm:p-7"
        style={delay(SCENE.sheet)}
      >
        <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-4">
          <span className="text-lg font-bold">Jueves 8 de octubre</span>
          <span className="text-sm text-muted-foreground">5 citas, 1 hora libre</span>
        </figcaption>
        <span className="sr-only">
          Ejemplo de un día en la agenda: a las 10:00 entra una reserva nueva de Ana Torres hecha desde su celular.
        </span>

        <ol aria-hidden className="divide-y">
          {DAY.map((row) => (
            <li key={row.time} className="grid grid-cols-[4.75rem_1fr] items-center gap-3 py-2.5 sm:grid-cols-[6rem_1fr]">
              <span
                className={cn(
                  "text-[1.6rem] leading-none font-bold tracking-[-0.02em] tabular-nums sm:text-[1.9rem]",
                  row.kind === "free" || row.kind === "blocked" ? "text-muted-foreground/50" : "text-ink",
                )}
              >
                {row.kind === "new" ? (
                  <span className="marker marker-sweep" style={{ "--marker-delay": `${SCENE.mark}s` } as CSSProperties}>
                    {row.time}
                  </span>
                ) : (
                  row.time
                )}
              </span>

              <span className="relative min-w-0">
                {row.kind === "booked" && (
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{row.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">{row.service}</span>
                    </span>
                    <StatusBadge status={row.status} className="hidden shrink-0 sm:inline-flex" />
                  </span>
                )}
                {row.kind === "free" && (
                  <span className="inline-block rounded-md border border-dashed border-ink/40 px-2.5 py-1 text-sm font-semibold text-ink/80">
                    Libre para reservar
                  </span>
                )}
                {row.kind === "blocked" && <span className="bg-hatch inline-block rounded-md px-2.5 py-1 text-sm text-muted-foreground">{row.reason}</span>}
                {row.kind === "new" && (
                  <>
                    {/* Antes de la reserva la hora estaba libre; desaparece cuando llega. */}
                    <span
                      className="absolute inset-y-0 left-0 flex items-center animate-out fill-mode-forwards duration-200 fade-out motion-reduce:hidden"
                      style={delay(SCENE.mark - 0.1)}
                    >
                      <span className="rounded-md border border-dashed border-ink/40 px-2.5 py-1 text-sm font-semibold text-ink/80">
                        Libre para reservar
                      </span>
                    </span>
                    <span
                      className="flex items-center justify-between gap-2 animate-in fill-mode-both duration-500 fade-in slide-in-from-left-2 motion-reduce:animate-none"
                      style={delay(SCENE.details)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{row.name}</span>
                        <span className="block truncate text-sm text-muted-foreground">Reservó {row.service.toLowerCase()} desde su celular</span>
                      </span>
                      <span className="hidden shrink-0 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white sm:inline">Nueva</span>
                    </span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      </figure>

      {/* El aviso que recibe el profesional cuando alguien reserva. */}
      <div
        aria-hidden
        className="absolute -bottom-7 -left-3 flex max-w-[17rem] items-start gap-3 rounded-xl bg-white p-3.5 text-foreground shadow-[0_20px_40px_-20px_rgb(29_36_51/0.35)] ring-1 ring-ink/10 animate-in fill-mode-both duration-500 fade-in slide-in-from-bottom-4 ease-out-soft motion-reduce:animate-none sm:-left-10"
        style={delay(SCENE.notice)}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-highlight text-ink">
          <BellRing className="size-4.5" />
        </span>
        <span className="min-w-0 text-sm">
          <span className="block font-bold">Nueva reserva online</span>
          <span className="block text-muted-foreground">Ana Torres, jueves a las 10:00</span>
        </span>
      </div>
    </div>
  );
}
