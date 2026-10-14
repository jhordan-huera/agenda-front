import { Check, Star } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminBusinesses } from "@/hooks/queries/use-admin";
import { PLANS } from "@/lib/constants/plans";
import { cn } from "@/lib/utils";
import type { PlanLimits } from "@/types";

const LIMIT_ROWS: { key: keyof PlanLimits; label: string }[] = [
  { key: "appointmentsPerMonth", label: "Citas al mes" },
  { key: "clients", label: "Clientes" },
  { key: "users", label: "Usuarios" },
  { key: "professionals", label: "Agendas" },
];

export default function AdminPlansPage() {
  const businesses = useAdminBusinesses();
  const countIn = (planId: string) => (businesses.data ?? []).filter((row) => row.subscription?.plan === planId).length;
  // El plan con más negocios, marcado (si hay empate, ninguno).
  const counts = PLANS.map((plan) => countIn(plan.id));
  const top = Math.max(0, ...counts);
  const mostUsed = top > 0 && counts.filter((count) => count === top).length === 1 ? PLANS[counts.indexOf(top)].id : null;

  return (
    <div className="space-y-6">
      <PageTitle title="Planes" />
      <PageHeader
        title="Planes"
        description="Límites y negocios en cada plan. Los límites los aplica la API en cada operación; los precios los acuerdas con cada negocio."
      />

      {businesses.isError ? (
        <ErrorState onRetry={() => businesses.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const inPlan = (businesses.data ?? []).filter((row) => row.subscription?.plan === plan.id);
            const agendas = inPlan.reduce((total, row) => total + row.usage.professionals, 0);
            return (
              <Card key={plan.id} className={cn("gap-5 px-5", plan.id === mostUsed && "ring-2 ring-primary/60")}>
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
                    {plan.name}
                    {plan.id === mostUsed && (
                      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-accent px-2 text-xs font-medium text-ink ring-1 ring-ink/20 ring-inset">
                        <Star className="size-3" aria-hidden /> Más usado
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Negocios</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {businesses.isPending ? <Skeleton className="mt-1 h-6 w-10" /> : inPlan.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Agendas activas</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {businesses.isPending ? <Skeleton className="mt-1 h-6 w-10" /> : agendas}
                    </dd>
                  </div>
                </dl>

                <dl className="divide-y rounded-lg border text-sm">
                  {LIMIT_ROWS.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">
                        {plan.limits[key] ?? (key === "professionals" ? "Las contratadas" : "Ilimitado")}
                      </dd>
                    </div>
                  ))}
                </dl>

                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {feature}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Los negocios no ven los planes ni los precios: el plan y las agendas contratadas (Business) se cambian desde la
        ficha de cada negocio.
      </p>
    </div>
  );
}
