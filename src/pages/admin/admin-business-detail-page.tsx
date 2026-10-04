import {
  ArrowLeft,
  Building2,
  ExternalLink,
  KeyRound,
  LifeBuoy,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  PlayCircle,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageTitle } from "@/components/shared/page-title";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminAuditList } from "@/features/admin/admin-audit-list";
import { BusinessStatusBadge, PlanBadge } from "@/features/admin/business-badges";
import { AddMemberDialog } from "@/features/admin/add-member-dialog";
import { PlanRequestsCard } from "@/features/admin/plan-requests-card";
import { useSetPasswordDialog } from "@/features/admin/use-set-password-dialog";
import { useSession } from "@/features/auth/use-session";
import { UsageMeter } from "@/features/billing/usage-meter";
import {
  useAdminBusiness,
  useChangeBusinessPlan,
  useSetBusinessStatus,
  useUpdateBusinessCategory,
} from "@/hooks/queries/use-admin";
import { useCategories } from "@/hooks/queries/use-categories";
import { TIMEZONES } from "@/lib/constants/business";
import { PLANS, getPlan } from "@/lib/constants/plans";
import { getErrorMessage } from "@/lib/data";
import { formatCurrency, formatDateTime, formatNumericDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import type { PlanId } from "@/types";

export default function AdminBusinessDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const detail = useAdminBusiness(id);
  const setStatus = useSetBusinessStatus();
  const changePlan = useChangeBusinessPlan();
  const updateCategory = useUpdateBusinessCategory();
  const { categories, label: categoryLabel } = useCategories();
  const setPassword = useSetPasswordDialog();
  const { enterSupport } = useSession();
  const navigate = useNavigate();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  // El plan elegido se conserva al cerrar para que el título no cambie durante la animación.
  const [planDialog, setPlanDialog] = useState<{ open: boolean; plan: PlanId | null }>({ open: false, plan: null });

  if (detail.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-14 w-80" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }
  if (detail.isError) return <ErrorState onRetry={() => detail.refetch()} />;
  if (!detail.data) {
    return (
      <EmptyState
        icon={Building2}
        title="Negocio no encontrado"
        description="Puede que el enlace sea incorrecto."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/businesses">
              <ArrowLeft /> Volver a negocios
            </Link>
          </Button>
        }
      />
    );
  }

  const { business, owner, subscription, usage, members, recentActivity } = detail.data;
  const suspended = business.status === "suspended";
  const plan = getPlan(subscription?.plan ?? "free");

  return (
    <div className="space-y-6">
      <PageTitle title={business.name} />
      <Link
        to="/admin/businesses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Negocios
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{business.name}</h1>
            <PlanBadge plan={plan.id} />
            <BusinessStatusBadge status={business.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {categoryLabel(business.category) || business.category} · Alta {formatNumericDate(business.createdAt.slice(0, 10))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            onClick={() => {
              enterSupport({ id: business.id, name: business.name });
              navigate("/dashboard");
            }}
          >
            <LifeBuoy /> Gestionar negocio
          </Button>
          {!suspended && (
            <Button asChild size="lg" variant="outline">
              <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink /> Página pública
              </a>
            </Button>
          )}
          <Button size="lg" variant={suspended ? "default" : "destructive"} onClick={() => setConfirmStatus(true)}>
            {suspended ? <PlayCircle /> : <PauseCircle />} {suspended ? "Reactivar negocio" : "Suspender negocio"}
          </Button>
        </div>
      </div>

      {suspended && (
        <p role="status" className="rounded-lg border border-amber-600/25 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Este negocio está suspendido: su equipo no puede entrar al panel y su página de reservas no está disponible.
        </p>
      )}

      <PlanRequestsCard businessId={business.id} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Suscripción y uso</CardTitle>
              <CardDescription>
                {formatCurrency(plan.price)}/mes
                {subscription?.currentPeriodEnd
                  ? ` · Renueva el ${formatNumericDate(subscription.currentPeriodEnd.slice(0, 10))}`
                  : " · Sin fecha de renovación"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                <p className="text-sm font-medium">Cambiar plan</p>
                <Select value={plan.id} onValueChange={(value) => setPlanDialog({ open: true, plan: value as PlanId })}>
                  <SelectTrigger aria-label="Plan del negocio" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {PLANS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} · {formatCurrency(option.price)}/mes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Simulado y sin cobro hasta integrar pagos.</p>
              </div>
              <div className="grid gap-3">
                <UsageMeter label="Citas este mes" used={usage.appointmentsThisMonth} limit={usage.limits.appointmentsPerMonth} />
                <UsageMeter label="Clientes" used={usage.clients} limit={usage.limits.clients} />
                <UsageMeter label="Usuarios" used={usage.users} limit={usage.limits.users} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Equipo</CardTitle>
              <CardDescription>
                Personas con acceso al panel de este negocio. Sólo tú agregas miembros y pones sus contraseñas.
              </CardDescription>
              <CardAction>
                <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                  <UserPlus /> Agregar
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-lg border">
                {members.map((member) => {
                  const name = `${member.firstName} ${member.lastName}`;
                  return (
                    <li key={member.userId} className="flex items-center gap-3 px-4 py-3">
                      <UserAvatar name={name} src={member.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Cambiar la contraseña de ${name}`}
                        title="Cambiar contraseña"
                        onClick={() => setPassword.request({ id: member.userId, name, email: member.email })}
                      >
                        <KeyRound />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>Últimas acciones en el negocio, incluidas las del super admin.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminAuditList entries={recentActivity} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Propietario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {owner ? (
                <>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={owner.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{owner.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{owner.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setPassword.request(owner)}>
                    <KeyRound /> Cambiar contraseña
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sin propietario.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-1.5">
                <p className="text-xs text-muted-foreground">Tipo de negocio</p>
                <Select
                  value={business.category}
                  disabled={updateCategory.isPending}
                  onValueChange={async (category) => {
                    try {
                      await updateCategory.mutateAsync({ businessId: business.id, category });
                      toast.success(`Tipo de negocio: ${categoryLabel(category)}`);
                    } catch (error) {
                      toast.error(getErrorMessage(error));
                    }
                  }}
                >
                  <SelectTrigger aria-label="Tipo de negocio" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {categories
                      .filter((category) => category.isActive || category.id === business.category)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="flex items-center gap-3">
                <ExternalLink className="size-4 text-muted-foreground" aria-hidden /> /book/{business.slug}
              </p>
              <p className="flex items-center gap-3">
                <Phone className="size-4 text-muted-foreground" aria-hidden /> {business.phone || "Sin teléfono"}
              </p>
              <p className="flex items-center gap-3">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
                <span className="truncate">{business.email || "Sin email"}</span>
              </p>
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /> {business.address || "Sin dirección"}
              </p>
              <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Zona horaria</dt>
                  <dd className="mt-0.5 font-medium">
                    {TIMEZONES.find((t) => t.value === business.timezone)?.label ?? business.timezone}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Última actividad</dt>
                  <dd className="mt-0.5 font-medium">
                    {detail.data.lastActivityAt ? formatDateTime(detail.data.lastActivityAt) : "—"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={suspended ? `¿Reactivar ${business.name}?` : `¿Suspender ${business.name}?`}
        description={
          suspended
            ? "Su equipo podrá volver a entrar y su página de reservas estará disponible de nuevo. Avisaremos al propietario por email."
            : "Su equipo no podrá usar el panel y su página de reservas dejará de estar disponible. Los datos se conservan. Avisaremos al propietario por email."
        }
        confirmLabel={suspended ? "Reactivar" : "Suspender"}
        destructive={!suspended}
        onConfirm={async () => {
          try {
            await setStatus.mutateAsync({ businessId: business.id, status: suspended ? "active" : "suspended" });
            toast.success(suspended ? "Negocio reactivado" : "Negocio suspendido");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
      <ConfirmDialog
        open={planDialog.open}
        onOpenChange={(open) => setPlanDialog((current) => ({ ...current, open }))}
        title={`¿Cambiar ${business.name} al plan ${planDialog.plan ? getPlan(planDialog.plan).name : ""}?`}
        description="El cambio se aplica de inmediato y queda registrado en la actividad del negocio. No se realiza ningún cobro."
        confirmLabel="Cambiar plan"
        onConfirm={async () => {
          const target = planDialog.plan;
          if (!target) return;
          try {
            await changePlan.mutateAsync({ businessId: business.id, plan: target });
            toast.success(`Plan cambiado a ${getPlan(target).name}`);
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
      {setPassword.dialog}
      <AddMemberDialog
        businessId={business.id}
        businessName={business.name}
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
      />
    </div>
  );
}
