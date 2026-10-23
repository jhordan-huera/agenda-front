import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { totalsOf } from "@/features/admin/calendar/calendar-figures";
import { DaySheet, type CalendarSelection } from "@/features/admin/calendar/day-sheet";
import { MonthGrid } from "@/features/admin/calendar/month-grid";
import { WeekHeatmap } from "@/features/admin/calendar/week-heatmap";
import { getRangeLabel, getVisibleDays, shiftDate } from "@/features/calendar/calendar-utils";
import { useAdminBusinesses, useAdminCalendar } from "@/hooks/queries/use-admin";
import { useCategories } from "@/hooks/queries/use-categories";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { getZonedNow } from "@/lib/time";
import type { AdminCalendarFilters, ISODate } from "@/types";

/** Las vistas: el mes (la de entrada) y la semana por horas. Van en la dirección (`?vista=`), como la Analítica. */
const VIEWS = [
  { value: "mes", label: "Mes", period: "month" },
  { value: "semana", label: "Semana", period: "week" },
] as const;
type View = (typeof VIEWS)[number]["value"];
const viewOf = (value: string | null): View => (value === "semana" ? "semana" : "mes");
const ALL = "todos";
const isISODate = (value: string | null): value is ISODate => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

/**
 * El calendario de la plataforma (spec 035): cuántas citas hay cada día y cada hora en Agenda360, en qué
 * negocios, en qué estado y de qué agenda. Sólo cifras: el super admin no tiene un calendario con las citas
 * de los negocios (constitución, principio II); las de un negocio se ven en su modo soporte.
 */
export default function AdminCalendarPage() {
  const [params, setParams] = useSearchParams();
  const today = getZonedNow(DEFAULT_TIMEZONE).date;
  const view = viewOf(params.get("vista"));
  const period = VIEWS.find((option) => option.value === view)!.period;
  const date = isISODate(params.get("fecha")) ? (params.get("fecha") as ISODate) : today;
  const category = params.get("tipo") ?? undefined;
  const businessId = params.get("negocio") ?? undefined;
  const [selection, setSelection] = useState<CalendarSelection | null>(null);
  // El día o la hora que abrió el panel: el foco vuelve ahí al cerrarlo.
  const opener = useRef<HTMLElement | null>(null);
  const select = (next: CalendarSelection) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelection(next);
  };

  const navigate = (changes: Record<string, string | null>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );

  const days = getVisibleDays(period, date);
  const filters = useMemo<AdminCalendarFilters>(() => ({ category, businessId }), [category, businessId]);
  const calendar = useAdminCalendar(days[0], days[days.length - 1], filters);
  const totals = useMemo(() => new Map((calendar.data?.days ?? []).map((day) => [day.date, day])), [calendar.data]);
  const month = date.slice(0, 7);
  const periodTotals = totalsOf(calendar.data?.days ?? [], (day) => (period === "month" ? day.startsWith(month) : days.includes(day)));

  // Los filtros: los tipos con negocios activos y, dentro del tipo elegido, sus negocios activos.
  const businesses = useAdminBusinesses();
  const categories = useCategories();
  const active = (businesses.data ?? []).filter((summary) => summary.business.status === "active");
  const types = [...new Set(active.map((summary) => summary.business.category))]
    .map((id) => ({ id, name: categories.label(id) || id }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const options = active
    .filter((summary) => !category || summary.business.category === category)
    .map((summary) => summary.business)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <div className="space-y-6">
      <PageTitle title="Calendario" />
      <PageHeader
        title="Calendario"
        description="Cuántas citas hay cada día en Agenda360, en qué negocios y en qué estado. Sólo cifras: sin pacientes, servicios ni notas."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border bg-background p-0.5">
            <Button variant="ghost" size="icon-sm" aria-label="Periodo anterior" onClick={() => navigate({ fecha: shiftDate(period, date, -1) })}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate({ fecha: null })}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Periodo siguiente" onClick={() => navigate({ fecha: shiftDate(period, date, 1) })}>
              <ChevronRight />
            </Button>
          </div>
          <h2 className="text-base font-semibold sm:text-lg" aria-live="polite">
            {getRangeLabel(period, date)}
          </h2>
          {calendar.isFetching && !calendar.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Actualizando" />}
        </div>
        <Tabs value={view} onValueChange={(value) => navigate({ vista: viewOf(value) })}>
          <TabsList aria-label="Vista">
            {VIEWS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="px-3">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid gap-2 sm:grid-cols-2 md:flex">
          <Select value={category ?? ALL} onValueChange={(value) => navigate({ tipo: value === ALL ? null : value, negocio: null })}>
            <SelectTrigger aria-label="Tipo de negocio" className="w-full bg-background md:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={businessId ?? ALL} onValueChange={(value) => navigate({ negocio: value === ALL ? null : value })}>
            <SelectTrigger aria-label="Negocio" className="w-full bg-background md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALL}>Todos los negocios</SelectItem>
              {options.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {calendar.data && (
          <p className="text-sm text-muted-foreground">
            {period === "month" ? "En el mes" : "En la semana"}:{" "}
            <strong className="text-foreground tabular-nums">{periodTotals.appointments}</strong> {periodTotals.appointments === 1 ? "cita" : "citas"}
            {periodTotals.unclosed > 0 && (
              <>
                {" · "}
                <strong className="font-semibold text-ink tabular-nums">{periodTotals.unclosed}</strong> sin cerrar
              </>
            )}
          </p>
        )}
      </div>

      {calendar.isPending ? (
        <Skeleton className="h-[28rem] rounded-xl" />
      ) : calendar.isError ? (
        <ErrorState onRetry={() => calendar.refetch()} />
      ) : period === "month" ? (
        <MonthGrid days={days} month={month} today={today} totals={totals} onSelect={(day) => select({ date: day, hour: null })} />
      ) : (
        <WeekHeatmap
          days={days}
          today={today}
          hours={calendar.data.hours}
          totals={totals}
          onSelect={(day, hour) => select({ date: day, hour })}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Cuentan los negocios activos, en la hora de cada negocio. Las canceladas no suman; «sin cerrar» son las de días pasados que
        siguen por confirmar o confirmadas.
      </p>

      <DaySheet
        selection={selection}
        filters={filters}
        onClose={() => setSelection(null)}
        onCloseAutoFocus={(event) => {
          if (!opener.current?.isConnected) return;
          event.preventDefault();
          opener.current.focus();
        }}
      />
    </div>
  );
}
