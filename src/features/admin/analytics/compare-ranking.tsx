import { useId, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import type { BusinessAnalytics } from "@/types";
import { BusinessStatusBadge, PlanBadge } from "../business-badges";
import { typicalRate } from "./analytics-format";
import { FEW_DATA_HINT, FewDataTag } from "./analytics-parts";
import { barScale, type CompareContext, type Direction, type Metric } from "./compare-metrics";

/**
 * Las cifras en las que más es peor: en ámbar, en lugar del color de la marca. Las negativas del
 * crecimiento, en rojo. El 500 se lee en los dos modos; en el oscuro, un poco más suave.
 */
const WORSE_BAR = "bg-amber-500 dark:bg-amber-500/90";
const NEGATIVE_BAR = "bg-rose-500 dark:bg-rose-500/90";

const percent = (fraction: number) => `${fraction * 100}%`;

/** El negocio: su nombre (enlace a la ficha), «Pocos datos» junto al nombre, su tipo, su plan y, si lo está, «Suspendido». */
function BusinessName({ business }: { business: BusinessAnalytics }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <Link
          to={`/admin/businesses/${business.id}`}
          onClick={(event) => event.stopPropagation()}
          className="max-w-full truncate text-sm font-medium hover:underline"
        >
          {business.name}
        </Link>
        {business.fewData && <FewDataTag title={FEW_DATA_HINT} className="h-4 px-1.5 text-[0.6875rem]" />}
      </div>
      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="truncate">{business.category.name}</span>
        <PlanBadge plan={business.plan} />
        {business.status === "suspended" && <BusinessStatusBadge status="suspended" />}
      </div>
    </div>
  );
}

interface RowProps {
  business: BusinessAnalytics;
  position: number;
  total: number;
  metric: Metric;
  ctx: CompareContext;
  scale: ReturnType<typeof barScale>;
  hintId: string;
  onOpen: (business: BusinessAnalytics, item: HTMLLIElement) => void;
}

function RankingRow({ business, position, total, metric, ctx, scale, hintId, onOpen }: RowProps) {
  const value = metric.value(business, ctx);
  const typical = metric.rateKey ? typicalRate(business, metric.rateKey, ctx.category(business)) : null;
  // Las tasas con «pocos datos» se ven atenuadas, como antes en la tabla.
  const muted = Boolean(metric.rateKey && business.fewData);
  const bar = value === null ? null : scale.bar(value);
  const color = muted
    ? "bg-muted-foreground/40"
    : (metric.tone?.(business) ?? (metric.scale === "signed" && value !== null && value < 0 ? NEGATIVE_BAR : metric.worse ? WORSE_BAR : "bg-primary"));
  const detail = metric.detail?.(business, ctx);

  const openWithKeyboard = (event: KeyboardEvent<HTMLLIElement>) => {
    // Sólo la fila: Enter en el enlace del nombre sigue abriendo la ficha.
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onOpen(business, event.currentTarget);
  };

  return (
    <li
      tabIndex={0}
      aria-describedby={hintId}
      onClick={(event) => onOpen(business, event.currentTarget)}
      onKeyDown={openWithKeyboard}
      className={cn(
        "grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 transition-colors outline-none hover:bg-muted/50",
        "focus-visible:bg-accent focus-visible:shadow-[inset_3px_0_0_var(--ring)]",
        "md:grid-cols-[1.5rem_minmax(0,16rem)_minmax(0,1fr)_11rem] md:gap-x-4 md:px-4",
      )}
    >
      <span aria-hidden className="row-span-2 self-start pt-0.5 text-right text-xs font-semibold text-muted-foreground tabular-nums md:row-span-1 md:self-center md:pt-0">
        {position}
      </span>
      <div className="col-span-2 min-w-0 md:col-span-1">
        <BusinessName business={business} />
      </div>
      {/* La barra: sólo un dibujo (la cifra va en texto al lado y, para el lector de pantalla, en la frase de abajo). */}
      <div aria-hidden className="relative h-2.5">
        {bar && (
          <>
            <span className="absolute inset-0 rounded-full bg-foreground/[0.07]" />
            <span
              className={cn("absolute inset-y-0 rounded-full", color, bar.size > 0 && "min-w-[3px]")}
              style={{ left: percent(bar.start), width: percent(bar.size) }}
            />
            {scale.zero !== null && <span className="absolute -inset-y-1 w-px bg-foreground/40" style={{ left: percent(scale.zero) }} />}
            {typical !== null && (
              <span
                className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground ring-2 ring-card"
                style={{ left: percent(Math.min(Math.max(typical, 0), 1)) }}
              />
            )}
          </>
        )}
      </div>
      <div aria-hidden className="max-w-[9.5rem] min-w-0 text-right leading-tight md:max-w-none">
        <p className={cn("text-sm font-semibold tabular-nums", (value === null || muted) && "text-muted-foreground")}>{metric.format(business, ctx)}</p>
        {detail !== null && detail !== undefined && <p className="mt-0.5 text-[0.6875rem] text-muted-foreground tabular-nums">{detail}</p>}
      </div>
      <span className="sr-only">
        {business.name}: {metric.spoken(business, ctx)}, {position}.º de {total}
      </span>
    </li>
  );
}

interface CompareRankingProps {
  /** Ya ordenados por la cifra. */
  rows: BusinessAnalytics[];
  metric: Metric;
  direction: Direction;
  ctx: CompareContext;
  /** Al tocar un negocio (o pulsar Enter en él): el panel con sus cifras. El elemento, para devolverle el foco. */
  onOpen: (business: BusinessAnalytics, item: HTMLLIElement) => void;
}

/**
 * El ranking de «Comparar»: un negocio por fila, ordenado por la cifra elegida, con una barra
 * proporcional (el mayor de los que se ven ocupa todo el ancho; las tasas, del 0 al 100 %) y, en las
 * tasas, una marca en la mediana de su tipo. Los nulos van al final, sin barra. Cada fila se enfoca con
 * el tabulador y se abre con Enter; el nombre sigue llevando a la ficha. A 390 px, el nombre va arriba y
 * la barra con su cifra, debajo.
 */
export function CompareRanking({ rows, metric, direction, ctx, onOpen }: CompareRankingProps) {
  const hintId = useId();
  const scale = barScale(metric, rows, ctx);
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <span id={hintId} className="sr-only">
        Pulsa Enter para ver sus cifras
      </span>
      <ol aria-label={`Negocios por ${metric.label}, ${direction === "desc" ? "de mayor a menor" : "de menor a mayor"}`} className="divide-y">
        {rows.map((business, index) => (
          <RankingRow
            key={business.id}
            business={business}
            position={index + 1}
            total={rows.length}
            metric={metric}
            ctx={ctx}
            scale={scale}
            hintId={hintId}
            onOpen={onOpen}
          />
        ))}
      </ol>
    </div>
  );
}
