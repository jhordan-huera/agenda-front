import type { LucideIcon } from "lucide-react";

/** Ícono en el título de una tarjeta (panel de plataforma, spec 007). */
export function CardTitleIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-ink" aria-hidden>
      <Icon className="size-4" />
    </span>
  );
}
