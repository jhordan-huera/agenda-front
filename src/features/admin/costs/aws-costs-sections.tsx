import { BellRing, CircleAlert, Coins, Layers, Receipt, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsdAmount } from "@/lib/constants/business";
import { formatDate, formatDateTime, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AwsAccountPlan, AwsCosts, AwsMonthCosts, ISODateTime } from "@/types";
import { alertState, awsMonthLabel, formatCostAmount, serviceLabel, splitServices } from "./aws-costs-format";

/**
 * Las tarjetas de la página «Costos» (spec 031): lo gastado en el mes con la previsión y el aviso, el plan de
 * AWS con sus créditos y el desglose por servicio. Una sola gama: la del panel (el principal y los grises).
 */

const PLAN_LABELS: Record<AwsAccountPlan["type"], string> = { PAID: "De pago", FREE: "Gratuito" };
const PLAN_STATUS_LABELS: Record<NonNullable<AwsAccountPlan["status"]>, string> = {
  ACTIVE: "activo",
  EXPIRED: "vencido",
  NOT_STARTED: "sin empezar",
};

/** «8 de octubre de 2027»: la fecha de AWS, en UTC (AWS las da a medianoche UTC; en Ecuador sería el día antes). */
const formatAwsDay = (iso: ISODateTime) => formatDate(iso.slice(0, 10), "d 'de' MMMM 'de' yyyy");

function CardHeading({ icon, title, description }: { icon: LucideIcon; title: string; description: ReactNode }) {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2.5">
        <CardTitleIcon icon={icon} /> {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );
}

/** Una cifra secundaria, sobre el gris del panel. */
function Figure({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-lg leading-snug font-bold tabular-nums">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/** Una nota que hay que ver, en el tono de la marca (nunca sólo el color: siempre el texto y su ícono). */
function Note({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm text-foreground">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/**
 * Lo gastado y la previsión frente al aviso, en una barra: lleno lo gastado, claro lo que falta hasta la
 * previsión y una raya en el monto del aviso. La escala es lo mayor de los tres: nada se sale.
 */
function AlertMeter({ usage, forecast, alert }: { usage: number; forecast: number | null; alert: number }) {
  const scale = Math.max(alert, forecast ?? 0, usage) || 1;
  const share = (amount: number) => Math.min(100, (amount / scale) * 100);
  const label = `Gastado ${formatCostAmount(usage)}${forecast === null ? "" : `, previsión ${formatCostAmount(forecast)}`}, frente al aviso de ${formatUsdAmount(alert)}`;
  return (
    <div className="space-y-2">
      <div className="relative mx-0.5 h-2.5 rounded-full bg-muted" role="img" aria-label={label}>
        {forecast !== null && forecast > usage && (
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary/25" style={{ width: `${share(forecast)}%` }} />
        )}
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${Math.max(usage > 0 ? 1.5 : 0, share(usage))}%` }} />
        <div className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground" style={{ left: `${share(alert)}%` }} />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Gastado
        </li>
        {forecast !== null && forecast > usage && (
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary/25" /> Previsión
          </li>
        )}
        <li className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 rounded-full bg-foreground" /> Tu aviso
        </li>
      </ul>
    </div>
  );
}

/**
 * «Lo gastado este mes»: la cifra principal, con el mes de AWS, lo que cubren los créditos y lo que se paga;
 * la previsión; el aviso (y si se pasó o se pasará a este ritmo), y cuándo se actualizó.
 */
export function AwsMonthCard({ costs, latest, className }: { costs: AwsCosts; latest: AwsMonthCosts; className?: string }) {
  const state = alertState(costs, latest);
  const alert = costs.alertAmount;
  return (
    <Card className={className}>
      <CardHeading icon={Receipt} title="Lo gastado este mes" description={`${awsMonthLabel(latest.month)}, el mes de facturación de AWS (cierra a las 19:00 de Ecuador).`} />
      <CardContent className="space-y-5">
        <div>
          <p className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">{formatCostAmount(latest.usage)}</p>
          {/* En el celular, una línea cada uno; en pantallas anchas, en la misma con «·». */}
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="block sm:inline">
              Lo cubren tus créditos: <span className="font-semibold text-foreground tabular-nums">{formatCostAmount(latest.credits)}</span>
            </span>
            <span className="hidden sm:inline" aria-hidden>
              {" · "}
            </span>
            <span className="block sm:inline">
              Pagas: <span className="font-semibold text-foreground tabular-nums">{formatCostAmount(latest.net)}</span>
            </span>
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Figure
            label="Previsión para fin de mes"
            value={latest.forecast === null ? "Todavía sin previsión" : formatCostAmount(latest.forecast)}
            hint={latest.forecast === null ? "Hace falta al menos un día cerrado del mes." : "Lo gastado, al ritmo que lleva el mes."}
          />
          <Figure
            label="Tu aviso de gasto"
            value={alert === null ? "Sin aviso" : formatUsdAmount(alert)}
            hint={alert === null ? "Ponlo abajo para que te avise." : costs.alertedThisMonth ? "Ya te avisamos este mes." : "Por ntfy y por email, una vez al mes."}
          />
        </dl>
        {alert !== null && <AlertMeter usage={latest.usage} forecast={latest.forecast} alert={alert} />}
        {state === "forecast" && alert !== null && (
          <Note icon={TrendingUp}>A este ritmo pasarás tu aviso de {formatUsdAmount(alert)} antes de fin de mes.</Note>
        )}
        {state === "passed" && alert !== null && (
          <Note icon={BellRing}>
            Lo gastado ya pasó tu aviso de {formatUsdAmount(alert)}
            {costs.alertedThisMonth ? ": te avisamos por ntfy y por email." : ": el aviso sale con la próxima actualización diaria."}
          </Note>
        )}
        <p className="text-xs text-muted-foreground">
          Actualizado el {formatDateTime(latest.fetchedAt)} (se actualiza solo una vez al día, y AWS tarda hasta un día en reflejar el uso).
        </p>
      </CardContent>
    </Card>
  );
}

/** Una fila de «Tu plan de AWS». */
function PlanRow({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right tabular-nums", strong ? "font-bold" : "font-medium")}>{children}</dd>
    </div>
  );
}

/**
 * «Tu plan de AWS»: el plan de la cuenta, los créditos que quedan y hasta cuándo valen (si AWS lo informa; si
 * no, dónde verlos), lo que cubrieron este mes y lo que se paga. En el plan gratuito, además, cuándo vence:
 * ese día AWS cierra la cuenta si no se pasa al de pago.
 */
export function AwsPlanCard({ latest, className }: { latest: AwsMonthCosts; className?: string }) {
  const plan = latest.plan;
  return (
    <Card className={className}>
      <CardHeading icon={Coins} title="Tu plan de AWS" description="El plan de la cuenta y los créditos que da AWS." />
      <CardContent className="space-y-4">
        <dl className="divide-y text-sm">
          <PlanRow label="Plan">
            {plan ? (
              <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">
                {PLAN_LABELS[plan.type]}
                {plan.type === "FREE" && plan.status ? ` · ${PLAN_STATUS_LABELS[plan.status]}` : ""}
              </span>
            ) : (
              <span className="font-normal text-muted-foreground">AWS no lo informó</span>
            )}
          </PlanRow>
          <PlanRow label="Créditos que quedan">
            {plan?.remainingCredits != null ? (
              formatUsdAmount(plan.remainingCredits)
            ) : (
              <span className="font-normal text-muted-foreground">Míralos en la consola de AWS → Créditos</span>
            )}
          </PlanRow>
          {plan?.type === "PAID" && plan.expiresAt && <PlanRow label="Valen hasta">{formatAwsDay(plan.expiresAt)}</PlanRow>}
          <PlanRow label="Cubrieron este mes">{formatCostAmount(latest.credits)}</PlanRow>
          <PlanRow label="Pagas de verdad" strong>
            {formatCostAmount(latest.net)}
          </PlanRow>
        </dl>
        {plan?.type === "FREE" && (
          <Note icon={CircleAlert}>
            {plan.expiresAt
              ? `El plan gratuito vence el ${formatAwsDay(plan.expiresAt)}: ese día AWS cierra la cuenta si no pasas al plan de pago.`
              : "Al vencer el plan gratuito, AWS cierra la cuenta si no pasas al plan de pago."}{" "}
            Cámbialo antes en la consola de AWS.
          </Note>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * «Por servicio»: lo gastado en cada servicio de AWS, de mayor a menor, con una barra en el principal frente al
 * que más gasta. Los que van en $0,00 se juntan en una línea; los de menos de un centavo dicen «menos de $0,01».
 */
export function AwsServicesCard({ latest, className }: { latest: AwsMonthCosts; className?: string }) {
  const { spent, zero } = splitServices(latest.services);
  const top = spent[0]?.amount ?? 0;
  return (
    <Card className={className}>
      <CardHeading icon={Layers} title="Por servicio" description="Lo gastado en cada servicio de AWS este mes, de mayor a menor, antes de los créditos." />
      <CardContent>
        {spent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía ningún servicio tiene gasto este mes.</p>
        ) : (
          <ul className="space-y-3.5">
            {spent.map((service) => {
              const label = serviceLabel(service.name);
              return (
                <li key={service.name} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 break-words">
                      <span className="font-medium">{label}</span>
                      {label !== service.name && <span className="block text-xs text-muted-foreground">{service.name}</span>}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatCostAmount(service.amount)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(1.5, top > 0 ? (service.amount / top) * 100 : 0)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {zero > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {spent.length > 0 ? "y " : ""}
            {plural(zero, "servicio", "servicios")} en $0,00
          </p>
        )}
      </CardContent>
    </Card>
  );
}
