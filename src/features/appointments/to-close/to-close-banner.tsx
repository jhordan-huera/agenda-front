import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";

/**
 * La franja «Tienes N citas por cerrar» (spec 018): con «Más tarde» en la pantalla de bloqueo y siempre en
 * el modo soporte del super admin (que nunca se bloquea). N es lo de la lista: las de días anteriores y las
 * de hoy que ya terminaron.
 */
export function ToCloseBanner({ total, support, onOpen }: { total: number; support: boolean; onOpen: () => void }) {
  const what = plural(total, "cita por cerrar", "citas por cerrar");
  return (
    <section
      aria-label="Citas por cerrar"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-lilac-ink/15 bg-highlight/45 px-4 py-2.5 text-sm sm:px-6 lg:px-8"
    >
      <p className="flex min-w-0 flex-1 items-start gap-2">
        <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-lilac-ink" aria-hidden />
        <span className="min-w-0">
          <strong className="font-semibold">{support ? `Este negocio tiene ${what}` : `Tienes ${what}`}</strong>
          {/* En el celular, sólo la cifra: la franja queda en una línea junto a «Cerrarlas». */}
          <span className="text-foreground/75 max-sm:hidden"> · ya terminaron y siguen pendientes o confirmadas.</span>
        </span>
      </p>
      <Button size="sm" variant="outline" className="shrink-0 bg-background" onClick={onOpen}>
        Cerrarlas
      </Button>
    </section>
  );
}
