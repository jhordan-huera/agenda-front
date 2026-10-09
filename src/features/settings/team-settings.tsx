import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { SupportContact } from "@/components/shared/support-contact";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AddMemberDialog } from "@/features/admin/add-member-dialog";
import { useSession } from "@/features/auth/use-session";
import { useAgendas, useMultiAgendaAccess } from "@/features/professionals/use-agendas";
import { useCurrentBusiness, usePlanUsage } from "@/hooks/queries/use-account";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { useRemoveMember, useSetClinicalAccess, useTeam, useUpdateMemberRole } from "@/hooks/queries/use-team";
import { APP_NAME, DEFAULT_SUPPORT_EMAIL } from "@/lib/constants/app";
import { getErrorMessage } from "@/lib/data";
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import type { BusinessRole, TeamMember } from "@/types";

type AssignableRole = Exclude<BusinessRole, "owner">;

export function TeamSettings() {
  const { session } = useSession();
  const team = useTeam();
  const agendas = useAgendas();
  // Cuenta individual (Free y Pro): sin rol Profesional ni agendas por persona.
  const multiAgenda = useMultiAgendaAccess();
  const usage = usePlanUsage();
  const updateRole = useUpdateMemberRole();
  const setClinicalAccess = useSetClinicalAccess();
  const { data: business } = useCurrentBusiness();
  const removeMember = useRemoveMember();
  const platform = usePlatformSettings();
  const supportEmail = platform.data?.supportEmail ?? DEFAULT_SUPPORT_EMAIL;
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const inSupport = Boolean(session?.support);
  const clinicalEnabled = Boolean(business?.clinicalRecordsEnabled);

  const limit = usage.data?.limits.users;
  const atLimit = usage.data ? limit !== null && usage.data.users >= (limit ?? 0) : false;

  const changeClinicalAccess = async (member: TeamMember, access: boolean) => {
    try {
      await setClinicalAccess.mutateAsync({ userId: member.userId, access });
      toast.success(
        access
          ? `${member.firstName} ya puede ver historias clínicas (al recargar la página)`
          : `${member.firstName} ya no puede ver historias clínicas`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const changeRole = async (member: TeamMember, role: AssignableRole) => {
    try {
      await updateRole.mutateAsync({ userId: member.userId, role });
      toast.success(`${member.firstName} ahora es ${ROLE_LABELS[role]}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipo</CardTitle>
          <CardDescription>
            {usage.data
              ? `${usage.data.users} de ${limit === null ? "usuarios ilimitados" : `${limit} usuario${limit === 1 ? "" : "s"}`} en tu plan.`
              : "Personas con acceso a tu negocio."}
          </CardDescription>
          {inSupport && (
            <CardAction>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <UserPlus /> Agregar
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {team.isPending ? (
            <Skeleton className="h-32" />
          ) : team.isError ? (
            <ErrorState onRetry={() => team.refetch()} />
          ) : (
            <ul className="divide-y rounded-lg border">
              {team.data.map((member) => {
                const name = `${member.firstName} ${member.lastName}`;
                const isOwner = member.role === "owner";
                const agenda = agendas.all.find((professional) => professional.userId === member.userId);
                return (
                  <li key={member.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <UserAvatar name={name} src={member.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {name}
                        {member.userId === session?.userId && <span className="text-muted-foreground"> (tú)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                      {multiAgenda && agenda ? (
                        <p className="truncate text-xs text-muted-foreground">Agenda: {agenda.displayName}</p>
                      ) : (
                        multiAgenda &&
                        member.role === "professional" && (
                          <p className="text-xs font-medium text-amber-700">
                            Sin agenda: asígnasela en{" "}
                            <Link to="/dashboard/professionals" className="underline underline-offset-2">
                              Profesionales
                            </Link>
                            .
                          </p>
                        )
                      )}
                    </div>
                    {isOwner ? (
                      <Badge variant="secondary">{ROLE_LABELS.owner}</Badge>
                    ) : (
                      <>
                        {clinicalEnabled && (
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              size="sm"
                              checked={member.clinicalAccess}
                              disabled={setClinicalAccess.isPending}
                              onCheckedChange={(checked) => changeClinicalAccess(member, checked)}
                              aria-label={`Acceso de ${name} a historias clínicas`}
                            />
                            Historia clínica
                          </label>
                        )}
                        <Select
                          value={member.role}
                          onValueChange={(role) => changeRole(member, role as AssignableRole)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger size="sm" className="w-36" aria-label={`Rol de ${name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {ASSIGNABLE_ROLES.filter((role) => role !== "professional" || multiAgenda || member.role === role).map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon-sm" aria-label={`Quitar a ${name}`} onClick={() => setRemoving(member)}>
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {atLimit
              ? "Llegaste al límite de usuarios de lo que tienes contratado. Para sumar más personas, escribe a soporte: "
              : "Para agregar a alguien a tu equipo o cambiar una contraseña, escribe a soporte: "}
            <SupportContact
              email={supportEmail}
              phone={platform.data?.supportPhone}
              message={`Hola, necesito ayuda con el equipo de ${business?.name ?? "mi negocio"} en ${APP_NAME}.`}
            />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles y permisos</CardTitle>
          <CardDescription>
            Los permisos también se comprueban en el servidor, no sólo en la interfaz.
            {clinicalEnabled && " Las historias clínicas sólo las ven el propietario y quienes tengan activado \"Historia clínica\"."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-3">
            {(["owner", "admin", "staff"] as const).map((role) => (
              <div key={role} className="rounded-lg border p-3">
                <dt className="text-sm font-medium">{ROLE_LABELS[role]}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {inSupport && session?.businessId && (
        <AddMemberDialog
          businessId={session.businessId}
          businessName={session.support?.businessName ?? ""}
          allowProfessionalRole={multiAgenda !== false}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`¿Quitar a ${removing?.firstName ?? "este miembro"} del equipo?`}
        description="Perderá el acceso al negocio de inmediato. Sus citas y registros se conservan."
        confirmLabel="Quitar"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          try {
            await removeMember.mutateAsync(removing.userId);
            toast.success("Miembro eliminado del equipo");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </div>
  );
}
