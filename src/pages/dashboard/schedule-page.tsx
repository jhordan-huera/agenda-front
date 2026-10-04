import { CalendarOff } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  const upcomingBlocks = (blockedTimesQuery.data ?? []).filter((block) => block.endDate >= today);

  return (
    <div className="space-y-6">
      <PageTitle title="Horarios" />
      <PageHeader
        title="Horarios"
        description="Define cuándo atiendes. Tus clientes sólo podrán reservar dentro de estos horarios."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {schedulesQuery.isPending ? (
          <Skeleton className="h-[520px] rounded-xl" />
        ) : schedulesQuery.isError ? (
          <ErrorState onRetry={() => schedulesQuery.refetch()} />
        ) : (
          <WeeklyScheduleCard schedules={schedulesQuery.data} />
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

      <BlockedTimeFormDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen} />
    </div>
  );
}
