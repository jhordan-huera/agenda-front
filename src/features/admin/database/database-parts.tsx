import { CircleAlert, CircleCheck, CircleX, Lightbulb, Unplug, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LEVEL_LABELS, type Level } from "./database-format";

/** Piezas comunes de la pantalla «Base de datos» (spec 024). */

const LEVEL_STYLES: Record<Level, { icon: LucideIcon; className: string }> = {
  ok: { icon: CircleCheck, className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  warn: { icon: CircleAlert, className: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  bad: { icon: CircleX, className: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
};

/** «Bien», «Atención» o «Alto», con su ícono (el color nunca va solo). */
export function LevelPill({ level }: { level: Level }) {
  const { icon: Icon, className } = LEVEL_STYLES[level];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", className)}>
      <Icon className="size-3.5" aria-hidden /> {LEVEL_LABELS[level]}
    </span>
  );
}

/** La barra de lo usado frente al tope, del color de su nivel. */
export function UsageBar({ share, level, label }: { share: number; level: Level; label: string }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
    >
      <div
        className={cn("h-full rounded-full", level === "ok" ? "bg-primary" : level === "warn" ? "bg-amber-500" : "bg-rose-500")}
        style={{ width: `${Math.min(100, Math.max(share > 0 ? 1 : 0, share * 100))}%` }}
      />
    </div>
  );
}

/** «Qué hacer»: la frase de cada sección que dice si hay que hacer algo, en español sencillo. */
export function HelpNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Una sección que no se pudo leer o que no está disponible en esta base: lo demás se ve igual. */
export function SectionNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-dashed px-4 py-3 text-sm">
      <Unplug className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/** «No se pudo leer ahora» (la API dice cuál fue el problema). */
export function SectionError({ message }: { message: string }) {
  return <SectionNotice title={message} description="Tardó más de 5 segundos o falló. Lo demás se ve igual; prueba con «Actualizar» en un momento." />;
}
