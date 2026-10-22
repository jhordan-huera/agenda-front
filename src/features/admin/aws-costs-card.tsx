import { ArrowRight, CircleAlert, Receipt } from "lucide-react";
import { Link } from "react-router";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAwsCosts } from "@/hooks/queries/use-admin";
import { formatUsdAmount } from "@/lib/constants/business";
import { formatDayMonth } from "@/lib/format";
import { awsMonthLabel, formatCostAmount } from "./costs/aws-costs-format";

/**
 * Los costos de AWS en el Inicio de /admin (spec 031): el total del mes y los créditos que quedan, con «Ver
 * costos». Sin datos todavía, «Aún sin datos de costos»; si la última actualización falló, también lo dice.
 * Siempre a la vista (no sólo cuando hay algo pendiente, como los cobros).
 */
export function AwsCostsCard() {
  const query = useAwsCosts();
  const costs = query.data;
  const latest = costs?.latest ?? null;
  const description = query.isPending
    ? "Cargando…"
    : query.isError
      ? "No se pudieron cargar los costos ahora."
      : latest
        ? `${awsMonthLabel(latest.month)} · actualizado el ${formatDayMonth(latest.fetchedAt)}`
        : "Aún sin datos de costos: el cron los actualiza una vez al día.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <CardTitleIcon icon={Receipt} /> Costos de AWS
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/costs">
              Ver costos <ArrowRight aria-hidden />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      {query.isPending ? (
        <CardContent>
          <Skeleton className="h-12 w-full max-w-sm" />
        </CardContent>
      ) : (
        (latest || costs?.lastError) && (
          <CardContent className="space-y-3">
            {latest && (
              <dl className="grid grid-cols-2 gap-3 sm:max-w-md">
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Gastado este mes</dt>
                  <dd className="text-2xl leading-tight font-extrabold tracking-tight tabular-nums">{formatCostAmount(latest.usage)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Créditos que quedan</dt>
                  <dd className={latest.plan?.remainingCredits != null ? "text-2xl leading-tight font-extrabold tracking-tight tabular-nums" : "pt-1 text-sm text-muted-foreground"}>
                    {latest.plan?.remainingCredits != null ? formatUsdAmount(latest.plan.remainingCredits) : "En la consola de AWS → Créditos"}
                  </dd>
                </div>
              </dl>
            )}
            {costs?.lastError && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CircleAlert className="mt-px size-3.5 shrink-0 text-destructive" aria-hidden />
                <span>No se pudo actualizar: {costs.lastError}.</span>
              </p>
            )}
          </CardContent>
        )
      )}
    </Card>
  );
}
