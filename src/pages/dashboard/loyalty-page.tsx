import { useSearchParams } from "react-router";
import { RequirePermission } from "@/components/layout/require-permission";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricStrip } from "@/features/dashboard/metric-strip";
import { LoyaltyBenefits } from "@/features/loyalty/loyalty-benefits";
import { LoyaltyMembers } from "@/features/loyalty/loyalty-members";
import { LoyaltyIntro, LoyaltyProgramForm } from "@/features/loyalty/loyalty-program-form";
import { LoyaltyRewards } from "@/features/loyalty/loyalty-rewards";
import { SettingsSectionSkeleton } from "@/features/settings/settings-section";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useLoyaltyBenefits, useLoyaltyProgram, useLoyaltySummary } from "@/hooks/queries/use-loyalty";
import { formatCount } from "@/lib/format";

const TABS = [
  { value: "programa", label: "Programa" },
  { value: "beneficios", label: "Beneficios" },
  { value: "pacientes", label: "Pacientes" },
  { value: "recompensas", label: "Recompensas" },
] as const;

/** «Fidelización» del panel (spec 052): el programa, los beneficios, los pacientes, las recompensas y las cifras. */
export default function LoyaltyPage() {
  return (
    <RequirePermission permission="loyalty.manage">
      <LoyaltyPageContent />
    </RequirePermission>
  );
}

function LoyaltyPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const businessQuery = useCurrentBusiness();
  const programQuery = useLoyaltyProgram();
  const benefitsQuery = useLoyaltyBenefits();
  const summaryQuery = useLoyaltySummary();
  const tabParam = searchParams.get("tab");
  const tab = TABS.some((option) => option.value === tabParam) ? tabParam! : "programa";
  const business = businessQuery.data;
  const program = programQuery.data;
  const summary = summaryQuery.data;
  const activeBenefits = (benefitsQuery.data ?? []).filter((benefit) => benefit.isActive).length;
  const count = (value: number | undefined) => (value === undefined ? "—" : formatCount(value));

  return (
    <div className="space-y-6">
      <PageTitle title="Fidelización" />
      <PageHeader
        title="Fidelización"
        description="Tu tarjeta de sellos: cada cita atendida suma uno y, al llegar a las citas de un beneficio, el paciente gana su premio."
      />

      <MetricStrip
        loading={summaryQuery.isPending}
        className="md:grid-cols-5 2xl:grid-cols-5"
        metrics={[
          { label: "Pacientes", value: count(summary?.participants), hint: "Con al menos un sello" },
          { label: "Sellos dados", value: count(summary?.stamps) },
          { label: "Por canjear", value: count(summary?.available), hint: "Recompensas disponibles" },
          { label: "Canjeadas", value: count(summary?.redeemed) },
          { label: "Vencidas", value: count(summary?.expired) },
        ]}
      />

      <Tabs value={tab} onValueChange={(value) => setSearchParams(value === "programa" ? {} : { tab: value }, { replace: true })}>
        {/* En el celular, en cuadrícula: las cuatro a la vista. */}
        <TabsList className="grid w-full grid-cols-2 gap-1 group-data-horizontal/tabs:h-auto sm:hidden">
          {TABS.map((option) => (
            <TabsTrigger key={option.value} value={option.value} className="h-9 px-1">
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="hidden overflow-x-auto sm:block">
          <TabsList variant="folder">
            {TABS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="px-3">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          {programQuery.isPending || businessQuery.isPending ? (
            <div className="max-w-3xl">
              <SettingsSectionSkeleton fields={5} />
            </div>
          ) : programQuery.isError || businessQuery.isError || !program || !business ? (
            <ErrorState
              onRetry={() => {
                void programQuery.refetch();
                void businessQuery.refetch();
              }}
            />
          ) : (
            <>
              <TabsContent value="programa" className="grid max-w-3xl gap-6">
                {!program.enabled && <LoyaltyIntro />}
                <LoyaltyProgramForm program={program} business={business} benefitCount={activeBenefits} />
              </TabsContent>
              <TabsContent value="beneficios" className="max-w-3xl">
                <LoyaltyBenefits currency={business.currency} />
              </TabsContent>
              <TabsContent value="pacientes" className="max-w-4xl">
                <LoyaltyMembers business={business} program={program} />
              </TabsContent>
              <TabsContent value="recompensas" className="max-w-5xl">
                <LoyaltyRewards business={business} />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
