import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CalendarRange,
  ExternalLink,
  History,
  KeyRound,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  UserRoundPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAuditList } from "@/features/admin/admin-audit-list";
import { VersusTypeCard } from "@/features/admin/analytics/versus-type-card";
import { AddMemberDialog } from "@/features/admin/add-member-dialog";
import { AddOwnerDialog } from "@/features/admin/add-owner-dialog";
import { BusinessHero } from "@/features/admin/business-hero";
import { ClientRequiredFieldsCard } from "@/features/admin/client-required-fields-card";
import { MultiClientAppointmentsCard } from "@/features/admin/multi-client-appointments-card";
import { DeleteBusinessDialog } from "@/features/admin/delete-business-dialog";
import { PlanRequestsCard } from "@/features/admin/plan-requests-card";
import { NEAR_LIMIT } from "@/features/admin/sales-lists";
import { StatGrid, type StatItem } from "@/features/admin/stat-cards";
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
import { formatDate, formatDateTime, toZonedDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import type { PlanId } from "@/types";
import { MaxProfessionalsField } from "@/features/admin/max-professionals-field";

/** Pestañas de la ficha (spec 007). Van en la dirección (`?pestana=`) para recargar o volver atrás sin perderla. */
const TABS = [
  { value: "resumen", label: "Resumen", icon: LayoutDashboard },
  { value: "equipo", label: "Equipo", icon: Users },
  { value: "ajustes", label: "Ajustes", icon: SlidersHorizontal },
  { value: "actividad", label: "Actividad", icon: History },
] as const;
type Tab = (typeof TABS)[number]["value"];
const isTab = (value: string | null): value is Tab => TABS.some((tab) => tab.value === value);

/** Una cifra del uso frente a su límite, con color si se acerca o llega (siempre con el texto). */
function usageStat(label: string, icon: StatItem["icon"], used: number, limit: number | null): StatItem {
  const share = limit ? used / limit : 0;
  return {
    label,
    icon,
    value: used,
    hint: limit === null ? "Sin límite en su plan" : `de ${limit} en su plan`,
    tone: limit === null ? "default" : share >= 1 ? "danger" : share >= NEAR_LIMIT ? "warning" : "default",
  };
}

/** «3 oct» (en la zona del panel) o, si no es de este año, «3 oct 2025»: desde cuándo está en su plan. */
function planSinceLabel(iso: string): string {
  const date = toZonedDate(iso);
  return formatDate(date, date.slice(0, 4) === toZonedDate(new Date().toISOString()).slice(0, 4) ? "d MMM" : "d MMM yyyy");
}

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
  const [params, setParams] = useSearchParams();
  // La pestaña cambia al momento; la dirección la acompaña (sin llenar el historial) para recargar o volver atrás.
  const [tab, setTab] = useState<Tab>(() => {
    const requested = params.get("pestana");
    return isTab(requested) ? requested : "resumen";
  });
  const changeTab = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("pestana", value);
        return next;
      },
      { replace: true },
    );
  };
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addOwnerOpen, setAddOwnerOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // El plan elegido se conserva al cerrar para que el título no cambie durante la animación.
  const [planDialog, setPlanDialog] = useState<{ open: boolean; plan: PlanId | null }>({ open: false, plan: null });

  if (detail.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-36 rounded-2xl" />
        <StatGrid items={[]} loading />
        <Skeleton className="h-72" />
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

      <BusinessHero
        business={business}
        plan={plan.id}
        categoryName={categoryLabel(business.category) || business.category}
        onManage={() => {
          enterSupport({ id: business.id, name: business.name });
          navigate("/dashboard");
        }}
        onToggleStatus={() => setConfirmStatus(true)}
      />

      {suspended && (
        <p role="status" className="rounded-lg border border-amber-600/25 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Este negocio está suspendido: su equipo no puede entrar al panel y su página de reservas no está disponible.
        </p>
      )}

      <StatGrid
        items={[
          usageStat("Citas del mes", CalendarDays, usage.appointmentsThisMonth, usage.limits.appointmentsPerMonth),
          usageStat("Pacientes", UsersRound, usage.clients, usage.limits.clients),
          usageStat("Usuarios", Users, usage.users, usage.limits.users),
          usageStat("Agendas", CalendarRange, usage.professionals, usage.limits.professionals),
        ]}
      />

      <PlanRequestsCard businessId={business.id} />

      <Tabs value={tab} onValueChange={changeTab} className="gap-5">
        <div className="overflow-x-auto border-b">
          <TabsList
            variant="line"
            aria-label="Secciones de la ficha"
            className="w-full justify-between gap-2 p-0 group-data-horizontal/tabs:h-11 sm:w-fit sm:justify-start sm:gap-4"
          >
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-none px-1 text-[0.9375rem] after:bg-primary group-data-horizontal/tabs:after:bottom-0 data-active:text-ink"
              >
                <Icon aria-hidden className="hidden sm:block" /> {label}
                {value === "equipo" && <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{members.length}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Las pestañas quedan montadas: un ajuste a medio escribir no se pierde al cambiar de pestaña. */}
        <TabsContent value="resumen" forceMount className="data-[state=inactive]:hidden">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Suscripción y uso</CardTitle>
                  <CardDescription>
                    {/* Desde cuándo está en su plan (spec 015): sin cobro todavía, no hay fecha de renovación. */}
                    {subscription?.planSince ? `En ${plan.name} desde el ${planSinceLabel(subscription.planSince)}` : `Plan ${plan.name}`}
                    . El negocio no ve planes ni precios.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="grid min-w-0 grid-cols-1 content-start gap-2">
                    <p className="text-sm font-medium">Cambiar plan</p>
                    <Select value={plan.id} onValueChange={(value) => setPlanDialog({ open: true, plan: value as PlanId })}>
                      <SelectTrigger aria-label="Plan del negocio" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {PLANS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">El cobro lo acuerdas tú con el negocio.</p>
                    {plan.id === "business" && (
                      <MaxProfessionalsField
                        key={subscription?.maxProfessionals ?? "sin-tope"}
                        businessId={business.id}
                        value={subscription?.maxProfessionals ?? null}
                        active={usage.professionals}
                      />
                    )}
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-3">
                    <UsageMeter label="Citas este mes" used={usage.appointmentsThisMonth} limit={usage.limits.appointmentsPerMonth} />
                    <UsageMeter label="Clientes" used={usage.clients} limit={usage.limits.clients} />
                    <UsageMeter label="Usuarios" used={usage.users} limit={usage.limits.users} />
                    <UsageMeter label="Agendas" used={usage.professionals} limit={usage.limits.professionals} />
                  </div>
                </CardContent>
              </Card>
              {/* Analítica (spec 016): de la última foto de 30 días; una API anterior no la trae. */}
              <VersusTypeCard analytics={detail.data.analytics ?? null} />
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
                    <>
                      <p className="text-sm text-muted-foreground">
                        Aún no tiene. Su página de reservas ya funciona; agrégalo cuando tengas sus datos.
                      </p>
                      <Button className="w-full" onClick={() => setAddOwnerOpen(true)}>
                        <UserRoundPlus /> Agregar propietario
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Información</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 gap-1.5">
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
        </TabsContent>

        <TabsContent value="equipo" forceMount className="data-[state=inactive]:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Equipo</CardTitle>
              <CardDescription>
                Personas con acceso al panel de este negocio. Sólo tú agregas miembros y pones sus contraseñas.
              </CardDescription>
              <CardAction>
                {/* El propietario primero: en Free sólo cabe un usuario. */}
                {owner ? (
                  <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                    <UserPlus /> Agregar
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setAddOwnerOpen(true)}>
                    <UserRoundPlus /> Agregar propietario
                  </Button>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              {members.length === 0 && (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Aún nadie entra a este negocio. Empieza por su propietario.
                </p>
              )}
              <ul className={members.length ? "divide-y rounded-lg border" : "hidden"}>
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
        </TabsContent>

        <TabsContent value="ajustes" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <ClientRequiredFieldsCard key={business.id} business={business} />
          <MultiClientAppointmentsCard key={`multi-${business.id}`} business={business} />
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Eliminar negocio</CardTitle>
              <CardDescription>
                Borra para siempre sus datos, sus historias clínicas y las cuentas de su equipo. No se puede deshacer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Eliminar negocio
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actividad" forceMount className="data-[state=inactive]:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>Últimas acciones en el negocio, incluidas las del super admin.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminAuditList entries={recentActivity} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
      <DeleteBusinessDialog business={business} members={members.length} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <AddMemberDialog
        businessId={business.id}
        businessName={business.name}
        allowProfessionalRole={plan.multipleAgendas}
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
      />
      <AddOwnerDialog businessId={business.id} businessName={business.name} open={addOwnerOpen} onOpenChange={setAddOwnerOpen} />
    </div>
  );
}
