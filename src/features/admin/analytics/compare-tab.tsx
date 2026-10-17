import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PLANS, getPlan } from "@/lib/constants/plans";
import { downloadCsv } from "@/lib/csv";
import { formatCurrency, normalizeSearch, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsRateKey, AnalyticsSnapshot, BusinessAnalytics, BusinessStatus, CategoryAnalytics, ISODate, PlanId } from "@/types";
import { BusinessStatusBadge, PlanBadge } from "../business-badges";
import { FilterChips } from "../filter-chips";
import {
  categoryOf,
  formatGrowth,
  HEALTH_LABELS,
  lastAccessLabel,
  RATE_KEYS,
  RATE_SHORT_LABELS,
  rateText,
  usageLabel,
} from "./analytics-format";
import { HealthBadge, RateValue } from "./analytics-parts";

type SortKey =
  | "name"
  | "appointments"
  | "growth"
  | AnalyticsRateKey
  | "activeClients"
  | "newClients"
  | "estimatedRevenue"
  | "collected"
  | "averageTicket"
  | "planUsage"
  | "agendas"
  | "lastAccess"
  | "health";
type Direction = "asc" | "desc";
type PlanFilter = PlanId | "all";
type StatusFilter = BusinessStatus | "all";
/** El tipo elegido: su id, «Sin tipo» (none) o todos. */
type TypeFilter = string;
const ALL_TYPES = "all";
const NO_TYPE = "none";

interface Context {
  category: (business: BusinessAnalytics) => CategoryAnalytics | null;
  today: ISODate;
}

interface Column {
  key: SortKey;
  label: string;
  /** Al tocarla la primera vez: de mayor a menor, salvo el nombre, la salud y el último acceso (los peores primero). */
  first?: Direction;
  /** Para ordenar; null va siempre al final. */
  sort: (business: BusinessAnalytics, ctx: Context) => number | string | null;
  cell: (business: BusinessAnalytics, ctx: Context) => ReactNode;
  /** Lo mismo, en texto, para el CSV. */
  text: (business: BusinessAnalytics, ctx: Context) => string;
  /** Ayuda al pasar el ratón por el título. */
  hint?: string;
}

const money = (business: BusinessAnalytics, amount: number | null) => (amount === null ? "—" : formatCurrency(amount, business.currency));

/** La parte del tope que usa (la mayor entre citas del mes y pacientes); null si su plan no tiene tope. */
function usageShare({ planUsage }: BusinessAnalytics): number | null {
  const shares = [planUsage.appointments, planUsage.clients].filter((use) => use.limit !== null).map((use) => use.used / use.limit!);
  return shares.length ? Math.max(...shares) : null;
}

function planUsageText(business: BusinessAnalytics): string {
  const { appointments, clients } = business.planUsage;
  if (appointments.limit === null && clients.limit === null) return "Sin tope";
  return `${usageLabel(appointments)} citas · ${usageLabel(clients)} pacientes`;
}

const rateColumn = (key: AnalyticsRateKey): Column => ({
  key,
  label: RATE_SHORT_LABELS[key],
  sort: (business) => business[key],
  cell: (business, ctx) => <RateValue business={business} rateKey={key} category={ctx.category(business)} />,
  text: (business, ctx) => rateText(business, key, ctx.category(business)),
});

const COLUMNS: Column[] = [
  {
    key: "name",
    label: "Negocio",
    first: "asc",
    sort: (business) => business.name,
    cell: (business) => (
      <span className="block max-w-36 min-w-0 sm:max-w-56">
        <Link
          to={`/admin/businesses/${business.id}`}
          onClick={(event) => event.stopPropagation()}
          className="block truncate font-medium hover:underline"
        >
          {business.name}
        </Link>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{business.category.name}</span>
          <PlanBadge plan={business.plan} />
        </span>
        {business.status === "suspended" && <BusinessStatusBadge status="suspended" className="mt-1" />}
      </span>
    ),
    text: (business) => business.name,
  },
  {
    key: "appointments",
    label: "Citas",
    sort: (business) => business.appointments,
    cell: (business) => (
      <span className="flex flex-col items-end leading-tight">
        <span className="font-semibold tabular-nums">{business.appointments}</span>
        {business.fewData && <span className="text-[0.6875rem] text-muted-foreground">pocos datos</span>}
      </span>
    ),
    text: (business) => String(business.appointments),
    hint: "Citas con fecha en el periodo, sin las canceladas",
  },
  {
    key: "growth",
    label: "Crecimiento",
    sort: (business) => (business.growth === "new" ? null : business.growth),
    cell: (business) => (
      <span
        className={cn(
          "font-semibold tabular-nums",
          business.growth === "new" ? "text-muted-foreground" : business.growth > 0 ? "text-emerald-700 dark:text-emerald-300" : business.growth < 0 ? "text-rose-700 dark:text-rose-300" : "",
        )}
      >
        {formatGrowth(business.growth)}
        <span className="block text-[0.6875rem] font-normal text-muted-foreground">antes {business.previousAppointments}</span>
      </span>
    ),
    text: (business) => formatGrowth(business.growth),
    hint: "Citas frente al periodo anterior de la misma duración",
  },
  ...RATE_KEYS.map(rateColumn),
  {
    key: "activeClients",
    label: "Pacientes activos",
    sort: (business) => business.activeClients,
    cell: (business) => <span className="tabular-nums">{business.activeClients}</span>,
    text: (business) => String(business.activeClients),
    hint: "Con alguna cita en el periodo",
  },
  {
    key: "newClients",
    label: "Pacientes nuevos",
    sort: (business) => business.newClients,
    cell: (business) => <span className="tabular-nums">{business.newClients}</span>,
    text: (business) => String(business.newClients),
    hint: "Registrados en el periodo (sin los importados)",
  },
  {
    key: "estimatedRevenue",
    label: "Ingresos estimados",
    sort: (business) => business.estimatedRevenue,
    cell: (business) => <span className="tabular-nums">{money(business, business.estimatedRevenue)}</span>,
    text: (business) => money(business, business.estimatedRevenue),
    hint: "El precio de las citas atendidas",
  },
  {
    key: "collected",
    label: "Cobrado",
    sort: (business) => business.collected,
    cell: (business) => <span className="tabular-nums">{money(business, business.collected)}</span>,
    text: (business) => money(business, business.collected),
    hint: "El precio de las citas marcadas como pagadas",
  },
  {
    key: "averageTicket",
    label: "Ticket promedio",
    sort: (business) => business.averageTicket,
    cell: (business) => <span className="tabular-nums">{money(business, business.averageTicket)}</span>,
    text: (business) => money(business, business.averageTicket),
    hint: "Ingresos estimados entre las atendidas con precio",
  },
  {
    key: "planUsage",
    label: "Uso del plan",
    sort: usageShare,
    cell: (business) => {
      const share = usageShare(business);
      return (
        <span
          className={cn(
            "text-xs tabular-nums",
            share === null ? "text-muted-foreground" : share >= 1 ? "font-semibold text-rose-700 dark:text-rose-300" : share >= 0.8 ? "font-semibold text-amber-700 dark:text-amber-300" : "",
          )}
        >
          {planUsageText(business)}
        </span>
      );
    },
    text: planUsageText,
    hint: "Citas del mes y pacientes frente al tope del plan",
  },
  {
    key: "agendas",
    label: "Agendas",
    sort: (business) => business.agendas.active,
    cell: (business) => (
      <span className="tabular-nums">{business.agendas.contracted === null ? business.agendas.active : `${business.agendas.active} de ${business.agendas.contracted}`}</span>
    ),
    text: (business) => (business.agendas.contracted === null ? String(business.agendas.active) : `${business.agendas.active} de ${business.agendas.contracted}`),
  },
  {
    key: "lastAccess",
    label: "Último acceso",
    first: "asc",
    sort: (business) => (business.lastTeamLoginAt ? Date.parse(business.lastTeamLoginAt) : null),
    cell: (business, ctx) => <span className="text-xs">{lastAccessLabel(business, ctx.today)}</span>,
    text: (business, ctx) => lastAccessLabel(business, ctx.today),
    hint: "El último inicio de sesión de alguien del equipo",
  },
  {
    key: "health",
    label: "Salud",
    first: "asc",
    sort: (business) => business.health.score,
    cell: (business) => <HealthBadge score={business.health.score} group={business.health.group} />,
    text: (business) => `${business.health.score} · ${HEALTH_LABELS[business.health.group]}`,
    hint: "De 0 a 100: sano, en riesgo o crítico (motivos en «Salud y ventas»)",
  },
];

const isRate = (key: SortKey): key is AnalyticsRateKey => (RATE_KEYS as string[]).includes(key);

/** Ordena por la columna; los nulos al final y, en las tasas, también los de «pocos datos». */
function sortRows(rows: BusinessAnalytics[], column: Column, direction: Direction, ctx: Context): BusinessAnalytics[] {
  return [...rows].sort((a, b) => {
    if (isRate(column.key) && a.fewData !== b.fewData) return a.fewData ? 1 : -1;
    const x = column.sort(a, ctx);
    const y = column.sort(b, ctx);
    if (x === null || y === null) return x === y ? a.name.localeCompare(b.name, "es") : x === null ? 1 : -1;
    const order = typeof x === "string" ? x.localeCompare(String(y), "es") : x - Number(y);
    return (direction === "asc" ? order : -order) || a.name.localeCompare(b.name, "es");
  });
}

const typeKey = (business: BusinessAnalytics) => business.category.id ?? NO_TYPE;

/**
 * Pestaña «Comparar» (Historia 1): todos los negocios con sus cifras del periodo. Se ordena tocando una
 * columna (otra vez, al revés), se filtra por tipo, plan y estado (por defecto, los activos), se busca por
 * nombre y se descarga en CSV tal como se ve. A 390 px se desplaza dentro de su recuadro, con el negocio fijo.
 */
export function CompareTab({ snapshot, today }: { snapshot: AnalyticsSnapshot; today: ISODate }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>(ALL_TYPES);
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [sort, setSort] = useState<{ key: SortKey; direction: Direction }>({ key: "appointments", direction: "desc" });

  const ctx = useMemo<Context>(() => ({ category: (business) => categoryOf(snapshot, business), today }), [snapshot, today]);
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
  const column = COLUMNS.find((candidate) => candidate.key === sort.key)!;
  const rows = sortRows(
    searched.filter((business) => matchesPlan(business, plan) && matchesStatus(business, status)),
    column,
    sort.direction,
    ctx,
  );

  const toggle = (next: Column) =>
    setSort((current) =>
      current.key === next.key
        ? { key: next.key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key: next.key, direction: next.first ?? "desc" },
    );
  const clear = () => {
    setSearch("");
    setType(ALL_TYPES);
    setPlan("all");
    setStatus("active");
  };
  const exportCsv = () =>
    downloadCsv(
      [
        ["Negocio", "Tipo", "Plan", "Estado", ...COLUMNS.slice(1).map((col) => col.label)],
        ...rows.map((business) => [
          business.name,
          business.category.name,
          getPlan(business.plan).name,
          business.status === "active" ? "Activo" : "Suspendido",
          ...COLUMNS.slice(1).map((col) => col.text(business, ctx)),
        ]),
      ],
      `analitica-${snapshot.periodDays}-dias-${snapshot.to}.csv`,
    );

  return (
    <div className="space-y-4">
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
        <>
          <p className="text-xs text-muted-foreground">
            {plural(rows.length, "negocio", "negocios")} · toca una columna para ordenar. «Pocos datos»: menos de 10 citas en el
            periodo; no cuentan para su tipo y, al ordenar por una tasa, van al final.
          </p>
          <div className="overflow-hidden rounded-xl border bg-background">
            <Table className="min-w-max">
              <caption className="sr-only">Negocios con sus cifras de los últimos {snapshot.periodDays} días</caption>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  {COLUMNS.map((col) => {
                    const active = sort.key === col.key;
                    const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
                    return (
                      <TableHead
                        key={col.key}
                        aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                        className={cn(
                          "px-3",
                          col.key === "name"
                            ? "sticky left-0 z-10 bg-muted pl-4 shadow-[inset_-1px_0_0_var(--border)]"
                            : "text-right",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(col)}
                          title={col.hint}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm font-medium outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50",
                            active && "text-ink",
                          )}
                        >
                          {col.label}
                          <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
                        </button>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((business) => (
                  <TableRow key={business.id} className="group cursor-pointer" onClick={() => navigate(`/admin/businesses/${business.id}`)}>
                    {COLUMNS.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "px-3",
                          col.key === "name"
                            ? "sticky left-0 z-10 bg-background pl-4 shadow-[inset_-1px_0_0_var(--border)] group-hover:bg-[color-mix(in_oklch,var(--muted)_50%,var(--background))]"
                            : "text-right",
                        )}
                      >
                        {col.cell(business, ctx)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
