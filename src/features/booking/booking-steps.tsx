import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type BookingStep = "service" | "datetime" | "details" | "confirm";

const STEPS: { value: BookingStep; label: string }[] = [
  { value: "service", label: "Servicio" },
  { value: "datetime", label: "Fecha y hora" },
  { value: "details", label: "Tus datos" },
  { value: "confirm", label: "Confirmar" },
];

/**
 * Pasos de la reserva como pestañas de agenda sobre la hoja: la del paso actual es del mismo
 * papel que la hoja y se une a ella; las de pasos ya hechos permiten volver atrás.
 */
export function BookingSteps({ current, onStepClick }: { current: BookingStep; onStepClick: (step: BookingStep) => void }) {
  const currentIndex = STEPS.findIndex((step) => step.value === current);

  return (
    <ol className="flex gap-1 px-2 sm:px-4">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          // En móvil la pestaña actual ocupa el espacio (con su nombre); las demás sólo muestran el número.
          <li key={step.value} className={cn("min-w-0 sm:flex-none", active ? "flex-1" : "w-12 shrink-0 sm:w-auto")}>
            <button
              type="button"
              disabled={!done}
              onClick={() => onStepClick(step.value)}
              aria-current={active ? "step" : undefined}
              aria-label={`Paso ${index + 1}: ${step.label}${done ? " (hecho)" : ""}`}
              className={cn(
                "relative -mb-px flex h-11 w-full items-center justify-center gap-2 rounded-t-lg border border-b-0 px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:cursor-default sm:px-4",
                active && "z-10 border-border bg-background font-bold text-ink",
                done && "border-transparent bg-accent font-semibold text-ink hover:bg-[color-mix(in_oklch,var(--accent),var(--ink)_8%)]",
                !active && !done && "border-transparent text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4 shrink-0" aria-hidden /> : <span className="tabular-nums">{index + 1}</span>}
              <span className={cn("truncate", !active && "hidden sm:inline")}>{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
