import { ArrowRight, Check, Minus, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { AnalyticsPeriodDays, BusinessAnalytics } from "@/types";
import { BusinessStatusBadge, PlanBadge } from "../business-badges";
import { nextPlan } from "../sales-lists";
import { FEATURE_HINTS, FEATURE_KEYS, FEATURE_LABELS } from "./analytics-format";
import { FEW_DATA_HINT, FewDataTag, HealthBadge } from "./analytics-parts";
import { helpOf, METRIC_GROUPS, METRICS, type CompareContext, type Metric } from "./compare-metrics";

/** Las cifras de cada tema en el panel. La salud tiene su propio apartado, con sus motivos. */
const SECTIONS = METRIC_GROUPS.map((group) => ({ group, metrics: METRICS.filter((metric) => metric.group === group && metric.key !== "salud") }));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** Cada cifra: su nombre, su valor con el dato secundario y, debajo, a todo el ancho, qué mide. */
function Figures({ business, ctx, metrics }: { business: BusinessAnalytics; ctx: CompareContext; metrics: Metric[] }) {
  return (
    <dl className="divide-y rounded-lg border">
      {metrics.map((metric) => {
        const detail = metric.detail?.(business, ctx);
        const empty = metric.value(business, ctx) === null || Boolean(metric.rateKey && business.fewData);
        return (
          <div key={metric.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 px-3 py-2">
            <dt className="text-sm">{metric.label}</dt>
            <dd className={cn("text-right text-sm font-semibold tabular-nums", empty && "text-muted-foreground")}>
              {metric.format(business, ctx)}
              {detail !== null && detail !== undefined && <span className="block text-[0.6875rem] font-normal text-muted-foreground">{detail}</span>}
            </dd>
            <dd className="col-span-2 mt-0.5 text-xs leading-snug text-muted-foreground">{helpOf(metric)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function Details({ business, ctx, periodDays }: { business: BusinessAnalytics; ctx: CompareContext; periodDays: AnalyticsPeriodDays }) {
  const offer = nextPlan(business.plan);
  const features = [...FEATURE_KEYS].sort((a, b) => Number(business.features[b]) - Number(business.features[a]));
  const used = FEATURE_KEYS.filter((key) => business.features[key]).length;
  return (
    <>
      <SheetHeader className="gap-1 border-b pr-12">
        <SheetTitle className="text-lg leading-snug font-semibold">{business.name}</SheetTitle>
        <SheetDescription>
          {business.category.name} · últimos {periodDays} días
        </SheetDescription>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <PlanBadge plan={business.plan} />
          <BusinessStatusBadge status={business.status} />
          {business.fewData && <FewDataTag title={FEW_DATA_HINT} />}
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <Section title="Salud">
          <div className="space-y-2 rounded-lg border px-3 py-2.5">
            <HealthBadge score={business.health.score} group={business.health.group} />
            {business.health.reasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin señales de riesgo.</p>
            ) : (
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {business.health.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        {business.upsell.length > 0 && (
          <div className="space-y-1.5 rounded-lg bg-accent px-3 py-2.5">
            <p className="text-sm font-semibold text-ink">Listo para subir de plan</p>
            <ul className="space-y-0.5 text-sm">
              {business.upsell.map((reason) => (
                <li key={reason} className="flex items-start gap-1.5">
                  <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
                  {reason}
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold text-ink">{offer ? `Ofrecerle ${offer.name}` : "Ofrecerle más agendas"}</p>
          </div>
        )}

        {SECTIONS.map((section) => (
          <Section key={section.group} title={section.group}>
            <Figures business={business} ctx={ctx} metrics={section.metrics} />
          </Section>
        ))}

        <Section title={`Funciones que usa · ${used} de ${FEATURE_KEYS.length}`}>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 md:grid-cols-2">
            {features.map((key) => {
              const on = business.features[key];
              return (
                <li key={key} title={FEATURE_HINTS[key]} className={cn("flex items-center gap-2 text-sm", !on && "text-muted-foreground")}>
                  {on ? (
                    <Check className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
                  ) : (
                    <Minus className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
                  )}
                  {FEATURE_LABELS[key]}
                  <span className="sr-only">{on ? ": la usa" : ": no la usa"}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      <SheetFooter className="border-t">
        <Button asChild>
          <Link to={`/admin/businesses/${business.id}`}>
            Abrir ficha <ArrowRight />
          </Link>
        </Button>
      </SheetFooter>
    </>
  );
}

interface BusinessAnalyticsSheetProps {
  business: BusinessAnalytics | null;
  ctx: CompareContext;
  periodDays: AnalyticsPeriodDays;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Al cerrarse: se abre sin disparador (lo abre una fila), así que el foco vuelve a donde diga quien lo abre. */
  onCloseAutoFocus: (event: Event) => void;
}

/**
 * El detalle de un negocio de «Comparar»: sus cifras por tema, la salud con sus motivos, por qué está
 * listo para subir de plan y las funciones que usa. A la derecha en la computadora y desde abajo en el
 * celular. Sólo muestra la foto del día: para cambiar algo, «Abrir ficha».
 */
export function BusinessAnalyticsSheet({ business, ctx, periodDays, open, onOpenChange, onCloseAutoFocus }: BusinessAnalyticsSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        onCloseAutoFocus={onCloseAutoFocus}
        className={cn("gap-0 p-0", isDesktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl")}
      >
        {business ? (
          <Details key={business.id} business={business} ctx={ctx} periodDays={periodDays} />
        ) : (
          <SheetTitle className="sr-only">Negocio</SheetTitle>
        )}
      </SheetContent>
    </Sheet>
  );
}
