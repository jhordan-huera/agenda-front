import { CalendarOff } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfessionalSelect } from "@/features/professionals/professional-select";
import { defaultAgendaId, useAgendas } from "@/features/professionals/use-agendas";
import { BlockedTimeFormDialog } from "@/features/schedule/blocked-time-form-dialog";
import { BlockedTimesList } from "@/features/schedule/blocked-times-list";
import { WeeklyScheduleCard } from "@/features/schedule/weekly-schedule-card";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useBlockedTimes, useSchedules } from "@/hooks/queries/use-schedule";
import { useBusinessNow } from "@/hooks/use-business-now";

export default function SchedulePage() {
  return (
    <RequirePermission permission="schedule.manage">
      <SchedulePageContent />
    </RequirePermission>
  );
}

function SchedulePageContent() {
  const { data: business } = useCurrentBusiness();
  const today = useBusinessNow(business?.timezone).date;
  const schedulesQuery = useSchedules();
  const blockedTimesQuery = useBlockedTimes();
  const agendas = useAgendas();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  // Desde Profesionales → "Horario y bloqueos" llega con ?professional=.
  const [picked, setPicked] = useState(() => searchParams.get("professional") ?? "");
  // La agenda que se edita: la elegida, la propia o la primera.
  const professionalId = agendas.selectable.some((p) => p.id === picked) ? picked : defaultAgendaId(agendas);
  const professional = agendas.byId(professionalId);

  // Con varias agendas: los bloqueos de la elegida y los de todo el negocio.
  const upcomingBlocks = (blockedTimesQuery.data ?? []).filter(
    (block) => block.endDate >= today && (!agendas.multiple || block.professionalId === null || block.professionalId === professionalId),
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Horarios" />
      <PageHeader
        title="Horarios"
        description={
          agendas.multiple
            ? "Cada profesional tiene su horario. Los pacientes sólo reservan dentro del horario de cada uno."
            : "Define cuándo atiendes. Tus clientes sólo podrán reservar dentro de estos horarios."
        }
      />

      {agendas.multiple && (
        <div className="grid max-w-sm gap-2">
          <Label htmlFor="schedule-professional">Profesional</Label>
          <ProfessionalSelect
            id="schedule-professional"
            professionals={agendas.selectable}
            value={professionalId}
            onValueChange={setPicked}
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {schedulesQuery.isPending || agendas.isPending ? (
          <Skeleton className="h-[520px] rounded-xl" />
        ) : schedulesQuery.isError ? (
          <ErrorState onRetry={() => schedulesQuery.refetch()} />
        ) : professionalId ? (
          <WeeklyScheduleCard
            key={professionalId}
            professionalId={professionalId}
            professionalName={agendas.multiple ? professional?.displayName : undefined}
            schedules={schedulesQuery.data.filter((schedule) => schedule.professionalId === professionalId)}
          />
        ) : (
          <ErrorState title="No hay profesionales activos" description="Activa un profesional para definir su horario." />
        )}

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Bloqueos de horario</CardTitle>
            <CardDescription>Vacaciones, trámites o franjas en las que no atenderás.</CardDescription>
            <CardAction>
              <Button size="sm" onClick={() => setBlockDialogOpen(true)}>
                <CalendarOff /> Bloquear
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {blockedTimesQuery.isPending ? (
              <Skeleton className="h-32" />
            ) : blockedTimesQuery.isError ? (
              <ErrorState onRetry={() => blockedTimesQuery.refetch()} />
            ) : (
              <BlockedTimesList blockedTimes={upcomingBlocks} />
            )}
          </CardContent>
        </Card>
      </div>

      <BlockedTimeFormDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        defaultProfessionalId={agendas.multiple ? professionalId : null}
      />
    </div>
  );
}
