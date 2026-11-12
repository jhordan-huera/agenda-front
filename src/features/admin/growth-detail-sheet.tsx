import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGrowthDetail } from "@/hooks/queries/use-admin";
import { queryKeys } from "@/hooks/queries/query-keys";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatDate, plural, toZonedDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminGrowthBusiness, AdminGrowthDetail, PlatformStats } from "@/types";
import { BusinessStatusBadge, PlanBadge } from "./business-badges";
import { currentLabel, GROWTH_METRICS, periodLabel, type GrowthMetric } from "./growth-labels";

type BusinessMetric = Exclude<GrowthMetric, "newBusinesses">;

/** Cómo se cuentan, en singular y en plural, y qué dice el panel si este mes todavía no hay nada. */
const WORDS: Record<GrowthMetric, { one: string; many: string; nothing: string }> = {
  appointments: { one: "cita", many: "citas", nothing: "Todavía no hay citas agendadas este mes." },
  onlineBookings: { one: "reserva online", many: "reservas online", nothing: "Todavía no hay reservas online este mes." },
  newClients: { one: "paciente nuevo", many: "pacientes nuevos", nothing: "Todavía no hay pacientes nuevos este mes." },
  newBusinesses: { one: "negocio nuevo", many: "negocios nuevos", nothing: "Todavía no hay negocios nuevos este mes." },
};

const BUSINESS_METRICS: BusinessMetric[] = ["appointments", "onlineBookings", "newClients"];

const totalOf = (rows: AdminGrowthBusiness[]) => rows.reduce((sum, row) => sum + row.current, 0);

/** «17 citas en 2 negocios», «1 negocio nuevo» o, sin nada este mes, lo que dice WORDS. */
function summaryOf(metric: GrowthMetric, detail: AdminGrowthDetail): string {
  const words = WORDS[metric];
  if (metric === "newBusinesses") {
    return detail.newBusinesses.length === 0 ? words.nothing : plural(detail.newBusinesses.length, words.one, words.many);
  }
  const rows = detail[metric];
  const total = totalOf(rows);
  if (total === 0) return words.nothing;
  return `${plural(total, words.one, words.many)} en ${plural(rows.filter((row) => row.current > 0).length, "negocio", "negocios")}`;
}

/** Las columnas de cada fila: el negocio, este mes, antes y la flecha. */
const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_4rem_3.5rem_1rem] items-center gap-x-2";

function BusinessRow({ row, previousText, children }: { row: AdminGrowthBusiness; previousText: string; children?: ReactNode }) {
  return (
    <li>
      <Link
        to={`/admin/businesses/${row.id}`}
        className={cn(
          ROW_GRID,
          "group rounded-lg px-3 py-3 outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        )}
      >
        <span className="min-w-0">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 font-medium break-words">{row.name}</span>
            {row.status !== "active" && <BusinessStatusBadge status={row.status} />}
          </span>
          {children}
        </span>
        <span aria-hidden className={cn("text-right text-xl font-semibold tabular-nums", row.current === 0 && "text-muted-foreground")}>
          {row.current}
        </span>
        <span aria-hidden className="text-right text-sm text-muted-foreground tabular-nums">
          {row.previous}
        </span>
        <span className="sr-only">
          : {row.current} este mes y {row.previous} {previousText}. Abre su ficha.
        </span>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
      </Link>
    </li>
  );
}

function BusinessList({ metric, detail }: { metric: BusinessMetric; detail: AdminGrowthDetail }) {
  // Los pacientes nuevos traen además su origen.
  const rows: (AdminGrowthBusiness & Partial<Pick<AdminGrowthDetail["newClients"][number], "online" | "dashboard">>)[] = detail[metric];
  const previous = periodLabel(detail.previousFrom, detail.previousTo);
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{WORDS[metric].nothing}</p>;
  return (
    <div className="space-y-1">
      <p aria-hidden className={cn(ROW_GRID, "px-3 pb-1 text-xs font-medium text-muted-foreground")}>
        <span>Negocio</span>
        <span className="text-right whitespace-nowrap">Este mes</span>
        <span className="text-right whitespace-nowrap">Antes</span>
        <span />
      </p>
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <BusinessRow key={row.id} row={row} previousText={previous.replace(/^el /, "del ").replace(/^todo /, "en todo ")}>
            {metric === "newClients" && row.current > 0 && (
              <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                Por la página {row.online} · Desde el panel {row.dashboard}
              </span>
            )}
          </BusinessRow>
        ))}
      </ul>
      <p className="px-3 pt-2 text-xs text-muted-foreground">
        «Antes» es {previous.replace(/^el /, "lo del ")}, para comparar.
      </p>
    </div>
  );
}

function NewBusinesses({ detail }: { detail: AdminGrowthDetail }) {
  if (detail.newBusinesses.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{WORDS.newBusinesses.nothing}</p>;
  }
  return (
    <ul className="space-y-0.5">
      {detail.newBusinesses.map((business) => (
        <li key={business.id}>
          <Link
            to={`/admin/businesses/${business.id}`}
            className="group flex items-center gap-3 rounded-lg px-3 py-3 outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{business.name}</span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>Alta el {formatDate(toZonedDate(business.createdAt), "d 'de' MMMM")}</span>
                <PlanBadge plan={business.plan ?? "free"} />
                <BusinessStatusBadge status={business.status} />
              </span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface GrowthDetailSheetProps {
  /** La tarjeta abierta; null: cerrado. */
  metric: GrowthMetric | null;
  /** Las cifras de las tarjetas: el periodo del título y, si el detalle no cuadra con ellas, se vuelven a pedir. */
  growth: PlatformStats["growth"];
  onClose: () => void;
}

/**
 * El detalle de una tarjeta de «Crecimiento del mes» (spec 042): las mismas cifras por negocio, que abren su
 * ficha. Sólo cifras: ni pacientes ni citas sueltas. A la derecha en el computador y desde abajo en el celular,
 * como el panel del día del calendario de /admin (spec 035).
 */
export function GrowthDetailSheet({ metric, growth, onClose }: GrowthDetailSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const queryClient = useQueryClient();
  // Al cerrarse sigue mostrando lo último mientras se va (sin saltar a vacío en la animación).
  const [shown, setShown] = useState(metric);
  if (metric && metric !== shown) setShown(metric);
  const detail = useAdminGrowthDetail(shown !== null);

  // Las tarjetas y el detalle se piden por separado: si entre una y otra entró algo, se pide de nuevo lo más viejo.
  const statsUpdatedAt = queryClient.getQueryState(queryKeys.admin.stats)?.dataUpdatedAt ?? 0;
  const { data, dataUpdatedAt, isFetching, refetch } = detail;
  useEffect(() => {
    if (!metric || !data || isFetching) return;
    if (statsUpdatedAt > dataUpdatedAt) {
      void refetch();
      return;
    }
    const differs =
      BUSINESS_METRICS.some((key) => totalOf(data[key]) !== growth[key].current) ||
      data.newBusinesses.length !== growth.newBusinesses.current;
    if (differs) void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats, exact: true });
    // Sólo al abrir un panel o al llegar un detalle nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, dataUpdatedAt]);

  const label = GROWTH_METRICS.find((item) => item.key === shown)?.label ?? "Crecimiento del mes";
  const period = currentLabel(growth.from, growth.to);

  return (
    <Sheet open={metric !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn("gap-0 p-0", isDesktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl")}
      >
        <SheetHeader className="gap-1 border-b pr-12">
          <SheetTitle className="text-lg leading-snug font-semibold">
            {label} · {period.charAt(0).toLowerCase() + period.slice(1)}
          </SheetTitle>
          <SheetDescription>{detail.data && shown ? summaryOf(shown, detail.data) : "Cargando las cifras…"}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          {detail.isPending ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : detail.isError ? (
            <ErrorState className="m-2" onRetry={() => detail.refetch()} />
          ) : shown === "newBusinesses" ? (
            <NewBusinesses detail={detail.data} />
          ) : shown ? (
            <BusinessList metric={shown} detail={detail.data} />
          ) : null}
        </div>

        <p className="border-t px-4 py-3 text-xs text-muted-foreground">
          Sólo cifras: sin datos de pacientes. Los pacientes de un negocio se ven en su modo soporte, cuando necesita
          asistencia.
        </p>
      </SheetContent>
    </Sheet>
  );
}
