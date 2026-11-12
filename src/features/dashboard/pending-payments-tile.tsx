import { ChevronRight, Wallet } from "lucide-react";
import { Link } from "react-router";
import { usePendingPaymentsSummary } from "@/hooks/queries/use-appointments";
import { formatCurrency } from "@/lib/format";

const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

/**
 * «Por cobrar» en Inicio (spec 046): lo que suman las sesiones atendidas sin marcar como pagadas, de cuántos
 * pacientes. Toda la tarjeta lleva a la lista de pacientes con el filtro «Con pagos pendientes». No sale si no
 * hay nada por cobrar, mientras carga ni si falla: el resto de Inicio sigue igual. El rol Profesional ve lo de
 * su agenda (lo filtra la API).
 */
export function PendingPaymentsTile({ currency }: { currency?: string }) {
  const summary = usePendingPaymentsSummary();
  if (!summary.data || summary.data.amount <= 0) return null;
  const { amount, clients, sessions } = summary.data;
  return (
    <Link
      to="/dashboard/clients"
      state={{ filter: "pending" }}
      aria-label={`Por cobrar: ${formatCurrency(amount, currency)} de ${count(clients, "paciente", "pacientes")}. Ver quiénes`}
      className="group block rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgb(16_24_40/0.04)] transition-colors outline-none hover:border-ink/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-6"
    >
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="size-4 text-ink" aria-hidden /> Por cobrar
      </p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.02em] tabular-nums">{formatCurrency(amount, currency)}</p>
      <p className="mt-1 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          De {count(clients, "paciente", "pacientes")}, {count(sessions, "sesión", "sesiones")}
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
      </p>
    </Link>
  );
}
