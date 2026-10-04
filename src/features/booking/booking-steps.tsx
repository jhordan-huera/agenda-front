import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type BookingStep = "service" | "datetime" | "details" | "confirm";

const STEPS: { value: BookingStep; label: string }[] = [
  { value: "service", label: "Servicio" },
  { value: "datetime", label: "Fecha y hora" },
  { value: "details", label: "Tus datos" },
  { value: "confirm", label: "Confirmar" },
];

/** Indicador de pasos; los pasos ya completados permiten volver atrás. */
export function BookingSteps({ current, onStepClick }: { current: BookingStep; onStepClick: (step: BookingStep) => void }) {
  const currentIndex = STEPS.findIndex((step) => step.value === current);

  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.value} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!done}
              onClick={() => onStepClick(step.value)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
                done && "hover:text-primary",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-primary bg-accent text-accent-foreground",
                  !active && !done && "text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span className={cn("hidden font-medium sm:inline", !active && !done && "text-muted-foreground")}>
                {step.label}
              </span>
            </button>
            {index < STEPS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
