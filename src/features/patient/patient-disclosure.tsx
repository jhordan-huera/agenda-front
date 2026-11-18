import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/** Un desplegable de la tarjeta («Tus visitas», «Premios anteriores»): cerrado al empezar, con el teclado también. */
export function PatientDisclosure({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <details className="group mt-3 rounded-2xl border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span>
          {title} <span className="font-normal text-muted-foreground">({count})</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t px-4 py-1">{children}</div>
    </details>
  );
}
