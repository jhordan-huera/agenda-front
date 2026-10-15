import { ChartNoAxesCombined, HeartPulse, Shapes, Sparkles, Table2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computedLabel } from "@/features/admin/analytics/analytics-format";
import { CompareTab } from "@/features/admin/analytics/compare-tab";
import { HealthTab } from "@/features/admin/analytics/health-tab";
import { TypesTab } from "@/features/admin/analytics/types-tab";
import { UsageTab } from "@/features/admin/analytics/usage-tab";
import { useAdminAnalytics } from "@/hooks/queries/use-admin";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { formatShortDate } from "@/lib/format";
import { addDaysISO, getZonedNow } from "@/lib/time";
import type { AnalyticsPeriodDays } from "@/types";

/** Pestañas de la analítica (spec 016). Van en la dirección (`?pestana=`, `?dias=`) para recargar o volver sin perderlas. */
const TABS = [
  { value: "comparar", label: "Comparar", short: "Comparar", icon: Table2 },
  { value: "tipos", label: "Por tipo de negocio", short: "Por tipo", icon: Shapes },
  { value: "salud", label: "Salud y ventas", short: "Salud", icon: HeartPulse },
  { value: "uso", label: "Uso y valor", short: "Uso", icon: Sparkles },
] as const;
type Tab = (typeof TABS)[number]["value"];
const isTab = (value: string | null): value is Tab => TABS.some((tab) => tab.value === value);
const PERIODS: AnalyticsPeriodDays[] = [30, 90];
const periodOf = (value: string | null): AnalyticsPeriodDays => (value === "90" ? 90 : 30);

/**
 * Analítica del super admin (spec 016): compara los negocios, los sitúa frente a su tipo, dice a quién
 * llamar y a quién ofrecerle un plan mejor, y qué valor les da Agenda360. Las cifras las prepara el cron
 * una vez al día (la «foto»): la página sólo la lee, así que se carga como cualquier otra de /admin.
 * Sin datos de pacientes: sólo cifras por negocio y el contacto de cada propietario.
 */
export default function AdminAnalyticsPage() {
  const [params, setParams] = useSearchParams();
  // La pestaña y el periodo cambian al momento; la dirección los acompaña (sin llenar el historial).
  const [tab, setTab] = useState<Tab>(() => {
    const requested = params.get("pestana");
    return isTab(requested) ? requested : "comparar";
  });
  const [days, setDays] = useState<AnalyticsPeriodDays>(() => periodOf(params.get("dias")));
  const remember = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(key, value);
        return next;
      },
      { replace: true },
    );
  const changeTab = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    remember("pestana", value);
  };
  const changeDays = (value: string) => {
    const next = periodOf(value);
    setDays(next);
    remember("dias", String(next));
  };

  const analytics = useAdminAnalytics(days);
  const snapshot = analytics.data;
  const today = getZonedNow(DEFAULT_TIMEZONE).date;

  return (
    <div className="space-y-6">
      <PageTitle title="Analítica" />
      <PageHeader
        title="Analítica"
        description={
          snapshot ? (
            <>
              {computedLabel(snapshot.computedAt, today)} · del {formatShortDate(snapshot.from)} al {formatShortDate(addDaysISO(snapshot.to, -1))}, frente a
              los {snapshot.periodDays} días anteriores
              <span className="block text-xs">Se preparan una vez al día: lo que pase después sale en la próxima.</span>
            </>
          ) : (
            "Cómo le va a cada negocio, frente a los demás y frente a su tipo."
          )
        }
        actions={
          <Tabs value={String(days)} onValueChange={changeDays}>
            <TabsList aria-label="Periodo">
              {PERIODS.map((period) => (
                <TabsTrigger key={period} value={String(period)} className="px-3">
                  {period} días
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {analytics.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-11 w-full max-w-xl" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : analytics.isError ? (
        <ErrorState onRetry={() => analytics.refetch()} />
      ) : !snapshot ? (
        <EmptyState
          icon={ChartNoAxesCombined}
          title="Las cifras se preparan cada mañana"
          description="Agenda360 prepara la analítica una vez al día, después de las 06:00. Vuelve en unos minutos."
        />
      ) : (
        <Tabs value={tab} onValueChange={changeTab} className="gap-5">
          <div className="overflow-x-auto border-b">
            <TabsList
              variant="line"
              aria-label="Secciones de la analítica"
              className="w-full justify-between gap-2 p-0 group-data-horizontal/tabs:h-11 sm:w-fit sm:justify-start sm:gap-4"
            >
              {TABS.map(({ value, label, short, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  aria-label={label}
                  className="flex-none px-1 text-[0.9375rem] after:bg-primary group-data-horizontal/tabs:after:bottom-0 data-active:text-ink"
                >
                  <Icon aria-hidden className="hidden sm:block" />
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* Montadas siempre: los filtros y el orden de la tabla no se pierden al cambiar de pestaña. */}
          <TabsContent value="comparar" forceMount className="data-[state=inactive]:hidden">
            <CompareTab snapshot={snapshot} today={today} />
          </TabsContent>
          <TabsContent value="tipos" forceMount className="data-[state=inactive]:hidden">
            <TypesTab snapshot={snapshot} />
          </TabsContent>
          <TabsContent value="salud" forceMount className="data-[state=inactive]:hidden">
            <HealthTab snapshot={snapshot} />
          </TabsContent>
          <TabsContent value="uso" forceMount className="data-[state=inactive]:hidden">
            <UsageTab snapshot={snapshot} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
