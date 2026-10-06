import { CalendarClock, Contact, Mail, MoreHorizontal, Pencil, Plus, Power, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { RequirePermission } from "@/components/layout/require-permission";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { ActiveBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfessionalDot } from "@/features/professionals/professional-select";
import { ProfessionalFormDialog } from "@/features/professionals/professional-form-dialog";
import { PlanLimitContact } from "@/features/support/plan-limit-contact";
import { useCurrentBusiness, usePlanUsage, useUpdateBusiness } from "@/hooks/queries/use-account";
import { useDeleteProfessional, useProfessionals, useSaveProfessional } from "@/hooks/queries/use-professionals";
import { useServices } from "@/hooks/queries/use-services";
import { useTeam } from "@/hooks/queries/use-team";
import { useErrorToast } from "@/hooks/use-error-toast";
import { getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Professional, ProfessionalScope } from "@/types";

export default function ProfessionalsPage() {
  return (
    <RequirePermission permission="professionals.manage">
      <ProfessionalsPageContent />
    </RequirePermission>
  );
}

function ProfessionalsPageContent() {
  const professionalsQuery = useProfessionals();
  const usage = usePlanUsage();
  const save = useSaveProfessional();
  const remove = useDeleteProfessional();
  const showError = useErrorToast();
  const [formState, setFormState] = useState<{ open: boolean; professional?: Professional }>({ open: false });
  const [deleting, setDeleting] = useState<Professional | null>(null);

  const professionals = professionalsQuery.data ?? [];
  const active = professionals.filter((p) => p.isActive).length;
  const limit = usage.data?.limits.professionals ?? null;
  const atLimit = limit !== null && active >= limit;

  const toggleActive = async (professional: Professional) => {
    const { displayName, title, avatarUrl, color, email, userId, allServices, serviceIds, notifyNewAppointments, dailyAgenda } =
      professional;
    try {
      await save.mutateAsync({
        id: professional.id,
        input: {
          displayName,
          title,
          avatarUrl,
          color,
          email,
          userId,
          allServices,
          serviceIds,
          notifyNewAppointments,
          dailyAgenda,
          isActive: !professional.isActive,
        },
      });
      toast.success(professional.isActive ? `${displayName} quedó inactivo` : `${displayName} está activo`);
    } catch (error) {
      showError(error);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Profesionales" />
      <PageHeader
        title="Profesionales"
        description={
          professionalsQuery.isSuccess
            ? `${active} ${active === 1 ? "agenda activa" : "agendas activas"}${limit !== null ? ` de ${limit} contratada${limit === 1 ? "" : "s"}` : ""}`
            : "Quién atiende en tu negocio: cada uno con su agenda."
        }
        actions={
          <Button size="lg" onClick={() => setFormState({ open: true })}>
            <Plus /> Nuevo profesional
          </Button>
        }
      />

      {atLimit && (
        <p role="status" className="rounded-lg border border-highlight bg-highlight/40 px-4 py-3 text-sm">
          {limit === 1
            ? "Tienes contratada una agenda."
            : `Tienes contratadas ${limit} agendas y están en uso.`}{" "}
          Puedes agregar profesionales inactivos; para activar más, escríbenos a <PlanLimitContact />.
        </p>
      )}

      {professionalsQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : professionalsQuery.isError ? (
        <ErrorState onRetry={() => professionalsQuery.refetch()} />
      ) : professionals.length === 0 ? (
        <EmptyState icon={Contact} title="Aún no hay profesionales" description="Agrega a quienes atienden en tu negocio." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {professionals.map((professional) => (
            <ProfessionalCard
              key={professional.id}
              professional={professional}
              onEdit={() => setFormState({ open: true, professional })}
              onToggleActive={() => toggleActive(professional)}
              onDelete={() => setDeleting(professional)}
            />
          ))}
        </div>
      )}

      {professionals.length > 1 && <PatientScopeCard />}

      <ProfessionalFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((current) => ({ ...current, open }))}
        professional={formState.professional}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar a ${deleting?.displayName}?`}
        description="Sólo se puede eliminar un profesional sin citas. Si ya atendió, desactívalo: así se conservan su historial y sus reportes."
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            toast.success("Profesional eliminado");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </div>
  );
}

function ProfessionalCard({
  professional,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  professional: Professional;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const { data: team = [] } = useTeam();
  const { data: services = [] } = useServices();
  const member = team.find((m) => m.userId === professional.userId);
  const serviceNames = professional.allServices
    ? "Todos los servicios"
    : services
        .filter((service) => professional.serviceIds.includes(service.id))
        .map((service) => service.name)
        .join(", ") || "Ningún servicio";

  return (
    <Card className={cn("gap-4 px-5 py-5", !professional.isActive && "bg-muted/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={professional.displayName} src={professional.avatarUrl} size="lg" />
          <div className="min-w-0 space-y-1">
            <h3 className="flex items-center gap-2 font-semibold">
              <ProfessionalDot color={professional.color} />
              <span className="truncate">{professional.displayName}</span>
            </h3>
            {professional.title && <p className="truncate text-sm text-muted-foreground">{professional.title}</p>}
            <ActiveBadge active={professional.isActive} />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${professional.displayName}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/schedule?professional=${professional.id}`}>
                <CalendarClock /> Horario y bloqueos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggleActive}>
              <Power /> {professional.isActive ? "Desactivar" : "Activar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <dl className="grid gap-1.5 border-t pt-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <UserRound className="size-4 shrink-0" aria-hidden />
          <dt className="sr-only">Usuario</dt>
          <dd className="truncate">{member ? `${member.firstName} ${member.lastName} (entra al sistema)` : "Sin usuario"}</dd>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="size-4 shrink-0" aria-hidden />
          <dt className="sr-only">Avisos</dt>
          <dd className="truncate">
            {professional.email
              ? `${professional.email}${professional.dailyAgenda ? " · agenda diaria" : ""}`
              : "Sin avisos por email"}
          </dd>
        </div>
        <div>
          <dt className="sr-only">Servicios</dt>
          <dd className="line-clamp-2 text-muted-foreground">{serviceNames}</dd>
        </div>
      </dl>
    </Card>
  );
}

/** Privacidad entre profesionales: qué pacientes ve quien tiene el rol Profesional. */
function PatientScopeCard() {
  const { data: business } = useCurrentBusiness();
  const update = useUpdateBusiness();
  const options: { value: ProfessionalScope; title: string; description: string }[] = [
    { value: "all", title: "Todos los pacientes", description: "Cada profesional ve la ficha de cualquier paciente del negocio." },
    {
      value: "own",
      title: "Sólo los suyos",
      description: "Ve únicamente a los pacientes con citas en su agenda o que registró él (también en la historia clínica).",
    },
  ];
  const change = async (value: ProfessionalScope) => {
    try {
      await update.mutateAsync({ professionalScope: value });
      toast.success("Guardado");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>¿Qué pacientes ve cada profesional?</CardTitle>
        <CardDescription>
          Para quienes tienen el rol Profesional (sólo ven su propia agenda). El propietario, los administradores y recepción
          ven a todos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label="Pacientes que ve cada profesional" className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => {
            const selected = business?.professionalScope === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!business || update.isPending}
                onClick={() => !selected && change(option.value)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected && "border-primary bg-accent hover:bg-accent",
                )}
              >
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
