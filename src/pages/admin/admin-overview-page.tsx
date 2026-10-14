import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { attentionItems } from "@/features/admin/attention";
import { AttentionCard } from "@/features/admin/attention-card";
import { PlanBadge } from "@/features/admin/business-badges";
import { BusinessActivityList } from "@/features/admin/business-activity-list";
import { CreateBusinessDialog } from "@/features/admin/create-business-dialog";
import { PlanRequestsCard } from "@/features/admin/plan-requests-card";
import { SignupsChart } from "@/features/admin/signups-chart";
import { getGreeting } from "@/features/dashboard/dashboard-metrics";
import { MetricStrip } from "@/features/dashboard/metric-strip";
import { useCurrentUser } from "@/hooks/queries/use-account";
import { useAdminBusinesses, useAdminPlanRequests, useAdminStats } from "@/hooks/queries/use-admin";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { PLANS } from "@/lib/constants/plans";
import { capitalize, formatLongDate, plural } from "@/lib/format";
import { getZonedNow } from "@/lib/time";

/** Negocios que se listan en el inicio (los de más citas este mes); el resto, en Negocios. */
const SHOWN_BUSINESSES = 8;

/**
 * Inicio del super admin, como un centro de control: primero lo que requiere atención (solicitudes
 * de plan, negocios cerca del cupo de su plan, sin actividad o suspendidos), las cifras de la
 * plataforma y la actividad de cada negocio; a un lado, los planes y las altas.
 */
export default function AdminOverviewPage() {
  const stats = useAdminStats();
  const businesses = useAdminBusinesses();
  const requests = useAdminPlanRequests();
  const { data: user } = useCurrentUser();
  const [creating, setCreating] = useState(false);
  const data = stats.data;
  const now = getZonedNow(DEFAULT_TIMEZONE);
  const pendingRequests = (requests.data ?? []).filter((request) => request.status === "pending").length;
  const resolvedRequests = (requests.data ?? []).length - pendingRequests;
  const attention = attentionItems(businesses.data ?? [], pendingRequests, now.date);
  const byActivity = [...(businesses.data ?? [])].sort(
    (a, b) => b.usage.appointmentsThisMonth - a.usage.appointmentsThisMonth || a.business.name.localeCompare(b.business.name),
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Plataforma" />
      <PageHeader
        title={user ? `${getGreeting(now.minutes)}, ${user.firstName}` : "Resumen de la plataforma"}
        description={`${capitalize(formatLongDate(now.date))} · Así va la plataforma.`}
        actions={
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus /> Nuevo negocio
          </Button>
        }
      />

      <AttentionCard items={attention} loading={businesses.isPending || requests.isPending} />

      {/* Con solicitudes pendientes, se resuelven aquí mismo. */}
      {pendingRequests > 0 && (
        <div id="solicitudes-de-plan" className="scroll-mt-4">
          <PlanRequestsCard />
        </div>
      )}

      {stats.isError ? (
        <ErrorState onRetry={() => stats.refetch()} />
      ) : (
        <MetricStrip
          loading={stats.isPending}
          className="md:grid-cols-4 2xl:grid-cols-4"
          metrics={[
            {
              label: "Negocios activos",
              value: data?.businesses.active,
              hint:
                data &&
                (data.businesses.newThisMonth > 0
                  ? `${plural(data.businesses.newThisMonth, "nuevo", "nuevos")} este mes`
                  : `${data.businesses.total} en total`),
            },
            { label: "Citas este mes", value: data?.appointmentsThisMonth, hint: "No canceladas, en todos los negocios" },
            { label: "Reservas online", value: data?.onlineBookingsThisMonth, hint: "Este mes, desde las páginas de reservas" },
            { label: "Usuarios", value: data?.users, hint: "Propietarios y equipos" },
          ]}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad de los negocios</CardTitle>
            <CardDescription>Los que más citas tienen este mes.</CardDescription>
            <CardAction>
              <Link to="/admin/businesses" className="text-sm font-medium text-primary hover:underline">
                Ver todos
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {businesses.isPending ? (
              <Skeleton className="h-64" />
            ) : businesses.isError ? (
              <ErrorState onRetry={() => businesses.refetch()} />
            ) : (
              <BusinessActivityList businesses={byActivity.slice(0, SHOWN_BUSINESSES)} today={now.date} />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Negocios por plan</CardTitle>
              <CardDescription>Incluye los suspendidos.</CardDescription>
            </CardHeader>
            <CardContent>
              {!data ? (
                <Skeleton className="h-32" />
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
          {data ? <SignupsChart data={data.signupsByMonth} /> : <Skeleton className="h-48 rounded-xl" />}
        </div>
      </div>

      {/* Sin pendientes, sólo como historial de las ya resueltas. */}
      {pendingRequests === 0 && resolvedRequests > 0 && <PlanRequestsCard />}

      <CreateBusinessDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
