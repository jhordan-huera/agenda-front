import { Plus } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { BillingOverviewCard } from "@/features/admin/billing-overview-card";
import { CreateBusinessDialog } from "@/features/admin/create-business-dialog";
import { GrowthSection } from "@/features/admin/growth-section";
import { HealthSection } from "@/features/admin/health-section";
import { PlanRequestsCard } from "@/features/admin/plan-requests-card";
import { ReferralRewardsSection } from "@/features/admin/referral-rewards-section";
import { SalesSection } from "@/features/admin/sales-section";
import { getGreeting } from "@/features/dashboard/dashboard-metrics";
import { useCurrentUser } from "@/hooks/queries/use-account";
import { useAdminBusinesses, useAdminPlanRequests, useAdminStats } from "@/hooks/queries/use-admin";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { PLANS } from "@/lib/constants/plans";
import { capitalize, formatLongDate, plural } from "@/lib/format";
import { getZonedNow } from "@/lib/time";

/**
 * Inicio del super admin con los datos importantes (spec 006): el crecimiento del mes, la salud del
 * sistema, los negocios para vender y los descuentos por referidos (spec 023). Arriba, el saludo, los
 * negocios por plan, los comprobantes de mensualidades por revisar y los cobros atrasados (spec 029) y las
 * solicitudes de cambio de plan pendientes (sólo si hay).
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
  const byPlan = data && PLANS.map((plan) => `${data.businessesByPlan[plan.id]} ${plan.name}`).join(" · ");

  return (
    <div className="space-y-8">
      <PageTitle title="Plataforma" />
      <PageHeader
        title={user ? `${getGreeting(now.minutes)}, ${user.firstName}` : "Resumen de la plataforma"}
        description={
          <>
            {capitalize(formatLongDate(now.date))}
            {data && (
              <span className="block">
                {plural(data.businesses.active, "negocio activo", "negocios activos")} de {data.businesses.total} · {byPlan}
              </span>
            )}
          </>
        }
        actions={
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus /> Nuevo negocio
          </Button>
        }
      />

      {/* Los cobros por revisar o atrasados (spec 029): sin ninguno, no ocupan lugar. */}
      <BillingOverviewCard billing={data?.billing} />

      {/* Las pendientes se resuelven aquí mismo; sin pendientes, no ocupan lugar. */}
      {pendingRequests > 0 && <PlanRequestsCard />}

      {stats.isError ? (
        <ErrorState onRetry={() => stats.refetch()} />
      ) : (
        <>
          <GrowthSection growth={data?.growth} />
          <HealthSection health={data?.health} today={now.date} />
        </>
      )}

      {businesses.isError ? (
        <ErrorState onRetry={() => businesses.refetch()} />
      ) : (
        <SalesSection businesses={businesses.data ?? []} loading={businesses.isPending} today={now.date} />
      )}

      <ReferralRewardsSection />

      <CreateBusinessDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
