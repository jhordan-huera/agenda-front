import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { MetricStrip } from "@/features/dashboard/metric-strip";
import { APP_NAME } from "@/lib/constants/app";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessStatusBadge, PlanBadge } from "@/features/admin/business-badges";
import { CreateBusinessDialog } from "@/features/admin/create-business-dialog";
import { PlanRequestsCard } from "@/features/admin/plan-requests-card";
import { SignupsChart } from "@/features/admin/signups-chart";
import { useAdminBusinesses, useAdminStats } from "@/hooks/queries/use-admin";
import { PLANS } from "@/lib/constants/plans";
import { formatCurrency, formatNumericDate, plural } from "@/lib/format";

export default function AdminOverviewPage() {
  const stats = useAdminStats();
  const businesses = useAdminBusinesses();
  const [creating, setCreating] = useState(false);
  const loading = stats.isPending;
  const data = stats.data;

  return (
    <div className="space-y-6">
      <PageTitle title="Plataforma" />
      <PageHeader
        title="Resumen de la plataforma"
        description={`Todos los negocios, usuarios y suscripciones de ${APP_NAME}.`}
        actions={
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus /> Nuevo negocio
          </Button>
        }
      />

      <PlanRequestsCard />

      {stats.isError ? (
        <ErrorState onRetry={() => stats.refetch()} />
      ) : (
        <MetricStrip
          loading={loading}
          className="md:grid-cols-5 2xl:grid-cols-5"
          metrics={[
            {
              label: "Negocios activos",
              value: data?.businesses.active,
              hint: data && `${plural(data.businesses.suspended, "suspendido", "suspendidos")}, ${data.businesses.total} en total`,
            },
            {
              label: "Ingresos recurrentes",
              value: data && formatCurrency(data.monthlyRecurringRevenue),
              hint: "Suscripciones de pago activas (MRR)",
            },
            { label: "Usuarios", value: data?.users, hint: "Propietarios y equipos" },
            { label: "Citas este mes", value: data?.appointmentsThisMonth, hint: "No canceladas, en todos los negocios" },
            { label: "Reservas online", value: data?.onlineBookingsThisMonth, hint: "Este mes, desde páginas públicas" },
          ]}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {data ? <SignupsChart data={data.signupsByMonth} /> : <Skeleton className="h-80 rounded-xl" />}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Negocios por plan</CardTitle>
            <CardDescription>Incluye negocios suspendidos.</CardDescription>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-40" />
            ) : (
              <ul className="space-y-4">
                {PLANS.map((plan) => {
                  const count = data.businessesByPlan[plan.id];
                  const share = data.businesses.total ? count / data.businesses.total : 0;
                  return (
                    <li key={plan.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <PlanBadge plan={plan.id} />
                        <span className="tabular-nums">
                          <span className="font-medium">{count}</span>{" "}
                          <span className="text-muted-foreground">({Math.round(share * 100)}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${share * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Negocios recientes</CardTitle>
          <CardAction>
            <Link to="/admin/businesses" className="text-sm font-medium text-primary hover:underline">
              Ver todos
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {businesses.isPending ? (
            <Skeleton className="h-40" />
          ) : businesses.isError ? (
            <ErrorState onRetry={() => businesses.refetch()} />
          ) : (
            <ul className="-mx-3 divide-y">
              {businesses.data.slice(0, 5).map(({ business, owner, subscription }) => (
                <li key={business.id}>
                  <Link
                    to={`/admin/businesses/${business.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-3 hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{business.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {owner?.name ?? "Sin propietario"} · Alta {formatNumericDate(business.createdAt.slice(0, 10))}
                      </span>
                    </span>
                    {subscription && <PlanBadge plan={subscription.plan} />}
                    <BusinessStatusBadge status={business.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateBusinessDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
