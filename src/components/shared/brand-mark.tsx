import { cn } from "@/lib/utils";

/**
 * Símbolo de Agenda360 (el mismo dibujo que public/icon-calendar.svg): una hoja de calendario con
 * la cabecera lila y el día reservado marcado en azul. Usa los colores de la marca (con los de un
 * negocio, toma los suyos). Van en `style`: algunos navegadores no pintan `fill="var(--x)"`.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect width="32" height="32" rx="8" style={{ fill: "var(--ink)" }} />
      <rect x="6.5" y="8" width="19" height="17.5" rx="3" style={{ fill: "var(--paper)" }} />
      <path d="M6.5 11a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v2.2h-19Z" style={{ fill: "var(--highlight)" }} />
      <rect x="10.4" y="5.4" width="2.6" height="5.2" rx="1.3" style={{ fill: "var(--paper)", stroke: "var(--ink)" }} strokeWidth="0.8" />
      <rect x="19" y="5.4" width="2.6" height="5.2" rx="1.3" style={{ fill: "var(--paper)", stroke: "var(--ink)" }} strokeWidth="0.8" />
      <g style={{ fill: "var(--chart-2)" }}>
        <rect x="9" y="15.6" width="3.4" height="3.2" rx="0.9" />
        <rect x="14.3" y="15.6" width="3.4" height="3.2" rx="0.9" />
        <rect x="19.6" y="15.6" width="3.4" height="3.2" rx="0.9" />
        <rect x="9" y="20.4" width="3.4" height="3.2" rx="0.9" />
        <rect x="19.6" y="20.4" width="3.4" height="3.2" rx="0.9" />
      </g>
      <rect x="14.3" y="20.4" width="3.4" height="3.2" rx="0.9" style={{ fill: "var(--ink)" }} />
    </svg>
  );
}
