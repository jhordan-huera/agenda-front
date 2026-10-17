import { BellRing, CheckCircle2, MailCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Etiqueta que flota junto al calendario de la portada y del acceso (decorativa: lo mismo lo cuenta
 * el texto). Entra con un retraso para que se lea en orden.
 */
export function FloatingChip({ className, delay, children }: { className: string; delay: number; children: ReactNode }) {
  return (
    <div
      aria-hidden
      style={{ animationDelay: `${delay}s` }}
      className={cn(
        "absolute z-10 hidden items-center gap-2.5 rounded-xl border border-border/70 bg-popover/95 px-3.5 py-2.5 shadow-[0_14px_30px_-14px_rgb(29_36_51/0.35)] backdrop-blur animate-in fill-mode-both duration-500 fade-in slide-in-from-bottom-2 motion-reduce:animate-none sm:flex",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Las tres etiquetas alrededor del calendario de ejemplo (portada y acceso): la reserva que entra,
 * la confirmación al cliente y el recordatorio. Van dentro de un contenedor `relative` junto a
 * `HeroCalendar`.
 */
export function CalendarChips() {
  return (
    <>
      <FloatingChip className="-bottom-8 -left-2 sm:-left-8" delay={1.4}>
        <span className="flex size-8 items-center justify-center rounded-full bg-highlight text-ink">
          <BellRing className="size-4" aria-hidden />
        </span>
        <span className="text-sm leading-tight">
          <span className="block font-semibold">Nueva reserva online</span>
          <span className="block text-xs text-muted-foreground">Ana Torres, jueves a las 10:00</span>
        </span>
      </FloatingChip>
      <FloatingChip className="-top-6 right-0 sm:-right-5" delay={2.2}>
        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <span className="text-sm font-semibold">Confirmación enviada</span>
      </FloatingChip>
      <FloatingChip className="-right-2 -bottom-8 sm:-right-6" delay={2.6}>
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <MailCheck className="size-4" aria-hidden />
        </span>
        <span className="text-sm leading-tight">
          <span className="block font-semibold">Recordatorio</span>
          <span className="block text-xs text-muted-foreground">Antes de cada cita</span>
        </span>
      </FloatingChip>
    </>
  );
}
