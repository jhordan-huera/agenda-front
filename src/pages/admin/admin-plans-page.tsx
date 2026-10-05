import { Check } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminBusinesses } from "@/hooks/queries/use-admin";
import { PLANS } from "@/lib/constants/plans";
import { formatCurrency } from "@/lib/format";
import type { PlanLimits } from "@/types";

const LIMIT_ROWS: { key: keyof PlanLimits; label: string }[] = [
  { key: "appointmentsPerMonth", label: "Citas al mes" },
  { key: "clients", label: "Clientes" },
  { key: "users", label: "Usuarios" },
];

export default function AdminPlansPage() {
  const businesses = useAdminBusinesses();

  return (
    <div className="space-y-6">
      <PageTitle title="Planes" />
      <PageHeader
        title="Planes"
        description="Precios, límites y negocios en cada plan. Los límites los aplica la API en cada operación."
      />

      {businesses.isError ? (
        <ErrorState onRetry={() => businesses.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const inPlan = (businesses.data ?? []).filter((row) => row.subscription?.plan === plan.id);
            const paying = inPlan.filter((row) => row.business.status === "active" && row.subscription?.status === "active");
            return (
              <Card key={plan.id} className="gap-5 px-5">
                <div>
                  <p className="text-lg font-bold">{plan.name}</p>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight">{formatCurrency(plan.price)}</span>
                    <span className="text-sm text-muted-foreground">/mes</span>
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
                    <dt className="text-xs text-muted-foreground">Ingresos / mes</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {businesses.isPending ? (
                        <Skeleton className="mt-1 h-6 w-16" />
                      ) : (
                        formatCurrency(Math.round(paying.length * plan.price * 100) / 100)
                      )}
                    </dd>
                  </div>
                </dl>

                <dl className="divide-y rounded-lg border text-sm">
                  {LIMIT_ROWS.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">{plan.limits[key] ?? "Ilimitado"}</dd>
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
        Los precios se editarán aquí cuando se integren los pagos: cada plan debe coincidir con su precio en el proveedor
        (por ejemplo, Stripe). En PostgreSQL viven en la tabla <code className="font-mono text-xs">plans</code>.
      </p>
    </div>
  );
}
