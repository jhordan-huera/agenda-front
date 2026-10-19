import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RankedBars } from "@/features/reports/ranked-bars";
import { formatDateTime } from "@/lib/format";
import type { DatabaseStats, DatabaseWork } from "@/types";
import { formatCount, formatMs, formatShare, isSectionError, WORKER_LABELS } from "./database-format";
import { HelpNote, SectionError, SectionNotice } from "./database-parts";

/** La frase de «Qué hacer»: si una consulta pesa mucho más que las demás, es la que conviene mejorar. */
function advice(work: DatabaseWork): string {
  const top = work.top[0];
  if (!top) return "Todavía no hay consultas contadas: vuelve en un rato.";
  const name = top.label ? `«${top.label}»` : "La primera de la lista";
  if (top.share >= 0.5) return `${name} se lleva más de la mitad del tiempo: es la que conviene mejorar si la base va lenta.`;
  return `El trabajo está repartido: ninguna consulta pesa mucho más que las demás. No hay que hacer nada.`;
}

/**
 * «Qué la hace trabajar» (historia 1): el tiempo total desde que se reiniciaron las estadísticas, el
 * reparto por quién y las 10 consultas que más tiempo consumen, en palabras cuando se reconocen y, si no,
 * su texto sin valores. Sin pg_stat_statements, «No disponible».
 */
export function DatabaseWorkCard({ stats }: { stats: DatabaseStats }) {
  const { work } = stats;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" aria-hidden /> Qué la hace trabajar
        </CardTitle>
        <CardDescription>
          El tiempo que pasó la base respondiendo consultas
          {work && !isSectionError(work) && work.since ? ` desde el ${formatDateTime(work.since)}, cuando se reiniciaron las estadísticas` : ""}. La app
          y el cron entran con la misma cuenta: el cron se cuenta por las consultas que sólo hace él.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {work === null ? (
          <SectionNotice
            title="No disponible"
            description="Esta base no tiene activa la estadística de consultas (pg_stat_statements). En Supabase viene activa."
          />
        ) : isSectionError(work) ? (
          <SectionError message={work.error} />
        ) : (
          <>
            <p>
              <span className="text-2xl font-bold tabular-nums">{formatMs(work.totalMs)}</span>{" "}
              <span className="text-muted-foreground">de trabajo · {formatCount(work.calls)} consultas</span>
            </p>
            <HelpNote>{advice(work)}</HelpNote>
            <section className="space-y-3" aria-labelledby="work-who">
              <h3 id="work-who" className="text-sm font-semibold">
                Por quién
              </h3>
              <RankedBars
                max={1}
                items={work.byWho.map((row) => ({
                  key: row.who,
                  label: row.label,
                  value: row.share,
                  detail: `${formatShare(row.share)} · ${formatMs(row.totalMs)}`,
                }))}
              />
            </section>
            <section className="space-y-2" aria-labelledby="work-top">
              <h3 id="work-top" className="text-sm font-semibold">
                Las {work.top.length} que más tiempo consumen
              </h3>
              <ol className="divide-y">
                {work.top.map((query, index) => (
                  <li key={index} className="space-y-1.5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 font-medium">
                        <span className="text-muted-foreground tabular-nums">{index + 1}.</span> {query.label ?? "Consulta sin nombre conocido"}
                      </p>
                      <span className="shrink-0 font-semibold tabular-nums">{formatShare(query.share)}</span>
                    </div>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Badge variant="secondary">{WORKER_LABELS[query.who]}</Badge>
                      <span>
                        {formatCount(query.calls)} {query.calls === 1 ? "vez" : "veces"} · {formatMs(query.totalMs)} en total · {formatMs(query.meanMs)} de media
                      </span>
                    </p>
                    <code className="block rounded-md bg-muted px-2.5 py-1.5 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {query.text}
                    </code>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground">Los textos van sin valores: PostgreSQL pone $1 en su lugar, y lo que va entre comillas se tapa.</p>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
