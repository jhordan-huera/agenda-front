import { Check, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/use-session";
import { UsageMeter } from "@/features/billing/usage-meter";
import {
  useCancelPlanRequest,
  usePendingPlanRequest,
  usePlanUsage,
  useRequestPlanChange,
  useSubscription,
} from "@/hooks/queries/use-account";
import { useAuditLogs } from "@/hooks/queries/use-activity";
import { PLANS, getPlan, type Plan } from "@/lib/constants/plans";
import { getErrorMessage } from "@/lib/data";
import { formatCurrency, formatDateTime, formatNumericDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABELS = { active: "Activa", trialing: "En prueba", past_due: "Pago pendiente", canceled: "Cancelada" } as const;

export function SubscriptionSettings() {
  const subscription = useSubscription();
  const usage = usePlanUsage();
  const history = useAuditLogs({ entityType: "subscription" });
  const pendingQuery = usePendingPlanRequest();
  const requestChange = useRequestPlanChange();
  const cancelRequest = useCancelPlanRequest();
  const { session } = useSession();
  const [target, setTarget] = useState<Plan | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // El propietario solicita el cambio y el super admin lo aprueba desde su panel. Esta pantalla nunca
  // cambia el plan directamente: en modo soporte, el super admin lo hace desde la ficha del negocio.
  const inSupport = Boolean(session?.support);
  const pending = pendingQuery.data ?? null;
  const current = subscription.data ? getPlan(subscription.data.plan) : null;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan actual</CardTitle>
          <CardDescription>
            {inSupport ? (
              <>
                Modo soporte: el plan se cambia desde la ficha del negocio en tu panel de admin (el propietario recibe un
                email).{" "}
                <Link to={`/admin/businesses/${session?.businessId}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Ir a la ficha <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </>
            ) : (
              "Para cambiar de plan envía una solicitud: el administrador la revisa y te avisamos por email. Los pagos online se habilitarán próximamente."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {pending && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-600/25 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <p className="flex items-center gap-2">
                <Clock className="size-4 shrink-0" aria-hidden />
                <span>
                  Solicitaste el plan <strong>{getPlan(pending.requestedPlan).name}</strong> el{" "}
                  {formatNumericDate(pending.createdAt.slice(0, 10))}. Está pendiente de aprobación.
                </span>
              </p>
              {!inSupport && (
                <Button size="sm" variant="outline" className="bg-white" onClick={() => setConfirmCancel(true)}>
                  Cancelar solicitud
                </Button>
              )}
            </div>
          )}
          {!current || !subscription.data || !usage.data ? (
            <Skeleton className="h-36" />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-2 text-xl font-semibold">
                  {current.name}
                  <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
                    {STATUS_LABELS[subscription.data.status]}
                  </Badge>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(current.price)}/mes
                  {subscription.data.currentPeriodEnd
                    ? ` · Renueva el ${formatNumericDate(subscription.data.currentPeriodEnd.slice(0, 10))}`
                    : " · Sin fecha de renovación"}
                </p>
              </div>
              <div className="grid gap-3">
                <UsageMeter label="Citas este mes" used={usage.data.appointmentsThisMonth} limit={usage.data.limits.appointmentsPerMonth} />
                <UsageMeter label="Clientes" used={usage.data.clients} limit={usage.data.limits.clients} />
                <UsageMeter label="Usuarios" used={usage.data.users} limit={usage.data.limits.users} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === current?.id;
          const isRequested = !inSupport && pending?.requestedPlan === plan.id;
          return (
            <Card key={plan.id} className={cn("gap-4 px-5", isCurrent && "ring-2 ring-primary")}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold tracking-wide uppercase">{plan.name}</p>
                {isCurrent && <Badge>Plan actual</Badge>}
              </div>
              <p className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">{formatCurrency(plan.price)}</span>
                <span className="text-sm text-muted-foreground">/mes</span>
              </p>
              <ul className="flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent || isRequested || (current && plan.price < current.price) ? "outline" : "default"}
                disabled={isCurrent || !current || inSupport || pending !== null || pendingQuery.isPending}
                onClick={() => setTarget(plan)}
              >
                {isCurrent ? "Tu plan" : isRequested ? "Solicitado" : `Solicitar ${plan.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Cambios de plan de tu negocio.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.isPending ? (
            <Skeleton className="h-20" />
          ) : history.data?.entries.length ? (
            <ul className="divide-y rounded-lg border text-sm">
              {history.data.entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                  <span>{entry.summary}</span>
                  <span className="text-muted-foreground">
                    {entry.actorName} · {formatDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={`¿Solicitar el plan ${target?.name}?`}
        description={`Precio: ${target ? formatCurrency(target.price) : ""}/mes. Enviaremos tu solicitud al administrador de la plataforma: cuando la apruebe, el plan se activa y te avisamos por email.`}
        confirmLabel="Enviar solicitud"
        onConfirm={async () => {
          if (!target) return;
          try {
            await requestChange.mutateAsync(target.id);
            toast.success("Solicitud enviada. Te avisaremos por email cuando se apruebe.");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={`¿Cancelar la solicitud del plan ${pending ? getPlan(pending.requestedPlan).name : ""}?`}
        description="Tu plan actual se mantiene. Puedes volver a solicitar un cambio cuando quieras."
        confirmLabel="Cancelar solicitud"
        destructive
        onConfirm={async () => {
          try {
            await cancelRequest.mutateAsync();
            toast.success("Solicitud cancelada");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </div>
  );
}
