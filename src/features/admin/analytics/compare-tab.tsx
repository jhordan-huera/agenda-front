import { ArrowDownWideNarrow, ArrowUpNarrowWide, Download, Search, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLANS, getPlan } from "@/lib/constants/plans";
import { downloadCsv } from "@/lib/csv";
import { normalizeSearch, plural } from "@/lib/format";
import type { AnalyticsSnapshot, BusinessAnalytics, BusinessStatus, ISODate, PlanId } from "@/types";
import { FilterChips } from "../filter-chips";
import { categoryOf } from "./analytics-format";
import { BusinessAnalyticsSheet } from "./business-analytics-sheet";
import {
  CSV_METRICS,
  DEFAULT_METRIC,
  isMetricKey,
  METRIC_GROUPS,
  metricOf,
  METRICS,
  rankRows,
  type CompareContext,
  type Direction,
  type MetricKey,
} from "./compare-metrics";
import { CompareRanking } from "./compare-ranking";
import { CompareSummary } from "./compare-summary";

type PlanFilter = PlanId | "all";
type StatusFilter = BusinessStatus | "all";
/** El tipo elegido: su id, «Sin tipo» (none) o todos. */
type TypeFilter = string;
const ALL_TYPES = "all";
const NO_TYPE = "none";

const typeKey = (business: BusinessAnalytics) => business.category.id ?? NO_TYPE;

/**
 * Pestaña «Comparar» (Historia 1): arriba, el resumen de los negocios que se ven; debajo, el ranking por
 * la cifra elegida («Comparar por»), con su barra. Se filtra por tipo, plan y estado (por defecto, los
 * activos), se busca por nombre y se descarga en CSV con todas las cifras, sea cual sea la elegida. Tocar
 * un negocio abre su detalle. La cifra va en la dirección (`?cifra=`) para poder compartirla.
 */
export function CompareTab({ snapshot, today }: { snapshot: AnalyticsSnapshot; today: ISODate }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>(ALL_TYPES);
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [order, setOrder] = useState<{ metric: MetricKey; direction: Direction }>(() => {
    const requested = params.get("cifra");
    return { metric: isMetricKey(requested) ? requested : DEFAULT_METRIC, direction: "desc" };
  });
  const [selected, setSelected] = useState<{ id: string; open: boolean } | null>(null);
  const rankingTop = useRef<HTMLDivElement>(null);
  // El negocio que abrió el panel: al cerrarlo, el foco vuelve a él.
  const opener = useRef<HTMLLIElement | null>(null);
  const labelId = useId();

  const ctx = useMemo<CompareContext>(() => ({ category: (business) => categoryOf(snapshot, business), today }), [snapshot, today]);
  const all = snapshot.businesses;
  const types = useMemo(() => {
    const seen = new Map<string, string>();
    for (const business of all) seen.set(typeKey(business), business.category.name);
    return [...seen.entries()].sort((a, b) => (a[0] === NO_TYPE ? 1 : b[0] === NO_TYPE ? -1 : a[1].localeCompare(b[1], "es")));
  }, [all]);

  const term = normalizeSearch(search.trim());
  const matchesSearch = (business: BusinessAnalytics) => !term || normalizeSearch(business.name).includes(term);
  const matchesType = (business: BusinessAnalytics) => type === ALL_TYPES || typeKey(business) === type;
  const matchesPlan = (business: BusinessAnalytics, value: PlanFilter) => value === "all" || business.plan === value;
  const matchesStatus = (business: BusinessAnalytics, value: StatusFilter) => value === "all" || business.status === value;
  // Cada número cuenta con la búsqueda, el tipo y el otro filtro: lo que quedaría al tocarlo.
  const searched = all.filter((business) => matchesSearch(business) && matchesType(business));
  const planCount = (value: PlanFilter) => searched.filter((business) => matchesStatus(business, status) && matchesPlan(business, value)).length;
  const statusCount = (value: StatusFilter) => searched.filter((business) => matchesPlan(business, plan) && matchesStatus(business, value)).length;
  const visible = searched.filter((business) => matchesPlan(business, plan) && matchesStatus(business, status));
  const metric = metricOf(order.metric);
  const rows = rankRows(visible, metric, order.direction, ctx);
  const selectedBusiness = selected ? (all.find((business) => business.id === selected.id) ?? null) : null;

  const rememberMetric = (value: MetricKey) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("cifra", value);
        return next;
      },
      { replace: true },
    );
  /** Otra cifra: de mayor a menor. */
  const changeMetric = (value: string) => {
    if (!isMetricKey(value)) return;
    setOrder({ metric: value, direction: "desc" });
    rememberMetric(value);
  };
  /** Desde el resumen: la cifra y el orden y, si el ranking queda lejos (en el celular), lo lleva a la vista. */
  const showInRanking = (value: MetricKey, direction: Direction) => {
    setOrder({ metric: value, direction });
    rememberMetric(value);
    const top = rankingTop.current;
    if (top && top.getBoundingClientRect().top > window.innerHeight * 0.6) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      top.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }
  };
  const toggleDirection = () => setOrder((current) => ({ ...current, direction: current.direction === "desc" ? "asc" : "desc" }));
  const clear = () => {
    setSearch("");
    setType(ALL_TYPES);
    setPlan("all");
    setStatus("active");
  };
  const exportCsv = () =>
    downloadCsv(
      [
        ["Negocio", "Tipo", "Plan", "Estado", ...CSV_METRICS.map((key) => metricOf(key).label)],
        ...rows.map((business) => [
          business.name,
          business.category.name,
          getPlan(business.plan).name,
          business.status === "active" ? "Activo" : "Suspendido",
          ...CSV_METRICS.map((key) => metricOf(key).text(business, ctx)),
        ]),
      ],
      `analitica-${snapshot.periodDays}-dias-${snapshot.to}.csv`,
    );

  return (
    <div className="space-y-4">
      <CompareSummary
        rows={visible}
        onUnclosed={() => showInRanking("sin-cerrar", "desc")}
        onHealth={() => showInRanking("salud", "asc")}
      />

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Buscar negocios"
              placeholder="Buscar por nombre…"
              className="h-9 bg-background pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label="Tipo de negocio" className="w-full bg-background sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALL_TYPES}>Todos los tipos</SelectItem>
              {types.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download /> Exportar CSV
          </Button>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6">
          <FilterChips
            label="Plan"
            value={plan}
            onChange={setPlan}
            options={[
              { value: "all", label: "Todos los planes", count: planCount("all") },
              ...PLANS.map((option) => ({ value: option.id, label: option.name, count: planCount(option.id) })),
            ]}
          />
          <FilterChips
            label="Estado"
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Activos", count: statusCount("active") },
              { value: "suspended", label: "Suspendidos", count: statusCount("suspended") },
              { value: "all", label: "Todos", count: statusCount("all") },
            ]}
          />
        </div>
      </div>

      <div ref={rankingTop} className="scroll-mt-20 space-y-2 lg:scroll-mt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span id={labelId} className="text-sm font-medium">
            Comparar por
          </span>
          <div className="flex gap-2">
            <Select value={metric.key} onValueChange={changeMetric}>
              <SelectTrigger aria-labelledby={labelId} className="min-w-0 flex-1 bg-background sm:w-60 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {METRIC_GROUPS.map((group) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {METRICS.filter((candidate) => candidate.group === group).map((candidate) => (
                      <SelectItem key={candidate.key} value={candidate.key}>
                        {candidate.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={toggleDirection} title="Cambiar el orden" className="shrink-0">
              {order.direction === "desc" ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
              {order.direction === "desc" ? "Mayor primero" : "Menor primero"}
              <span className="sr-only">. Cambiar a {order.direction === "desc" ? "menor" : "mayor"} primero</span>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {metric.worse && (
            <span className="mr-1.5 inline-flex h-4 items-center rounded-full bg-amber-50 px-1.5 text-[0.6875rem] font-semibold text-amber-800 ring-1 ring-amber-600/25 ring-inset dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40">
              Mayor es peor
            </span>
          )}
          {metric.hint}.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="No hay negocios que coincidan con la búsqueda o los filtros."
          action={
            <Button variant="outline" onClick={clear}>
              <X /> Limpiar filtros
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {plural(rows.length, "negocio", "negocios")} · toca uno para ver su detalle.
            {rows.some((business) => business.fewData) &&
              " «Pocos datos»: menos de 10 citas en el periodo; no cuentan para su tipo y, al comparar por una tasa, van al final."}
          </p>
          <CompareRanking
            rows={rows}
            metric={metric}
            direction={order.direction}
            ctx={ctx}
            onOpen={(business, item) => {
              opener.current = item;
              setSelected({ id: business.id, open: true });
            }}
          />
        </div>
      )}

      <BusinessAnalyticsSheet
        business={selectedBusiness}
        ctx={ctx}
        periodDays={snapshot.periodDays}
        open={Boolean(selected?.open)}
        onOpenChange={(open) => setSelected((current) => (current ? { ...current, open } : null))}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener.current?.isConnected) opener.current.focus();
        }}
      />
    </div>
  );
}
