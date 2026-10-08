import { CalendarCheck, CalendarOff, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppointmentDialogs } from "@/features/appointments/use-appointment-dialogs";
import { usePermissions } from "@/features/auth/use-permissions";
import {
  CALENDAR_VIEWS,
  getHourRange,
  getRangeLabel,
  getVisibleDays,
  isCalendarView,
  shiftDate,
  type CalendarView,
} from "@/features/calendar/calendar-utils";
import { AgendaListView } from "@/features/calendar/agenda-list-view";
import { MonthView } from "@/features/calendar/month-view";
import { StatusLegend } from "@/features/calendar/status-legend";
import { TimeGridView, type GridColumn } from "@/features/calendar/time-grid-view";
import { ALL_AGENDAS, ProfessionalSelect } from "@/features/professionals/professional-select";
import { useAgendas } from "@/features/professionals/use-agendas";
import { BlockedTimeFormDialog } from "@/features/schedule/blocked-time-form-dialog";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments, useMoveAppointment } from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBlockedTimes, useSchedules } from "@/hooks/queries/use-schedule";
import { useBusinessNow } from "@/hooks/use-business-now";
import { useMediaQuery } from "@/hooks/use-media-query";
import { offersService } from "@/lib/availability";
import { BLOCKING_STATUSES } from "@/lib/constants/appointment-status";
import { formatDate } from "@/lib/format";
import { minutesToTime, timeToMinutes } from "@/lib/time";
import { dateField } from "@/lib/validations/fields";

export default function CalendarPage() {
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Vista por defecto: semana en escritorio, día en móvil.
  const [defaultView] = useState<CalendarView>(isDesktop ? "week" : "day");
  const [showCancelled, setShowCancelled] = useState(true);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const { can } = usePermissions();

  // La vista y la fecha viven en la URL (?view=week&date=2026-10-01): enlaces compartibles.
  const viewParam = searchParams.get("view");
  const dateParam = searchParams.get("date") ?? "";
  const view = isCalendarView(viewParam) ? viewParam : defaultView;
  const date = dateField.safeParse(dateParam).success ? dateParam : now.date;
  // Con varias agendas: ?agenda=<id> muestra la de un profesional; sin él, todas.
  const agendas = useAgendas();
  const agendaParam = searchParams.get("agenda");
  const agenda = agendas.multiple && agendas.selectable.some((p) => p.id === agendaParam) ? agendaParam! : ALL_AGENDAS;
  const navigate = (next: { view?: CalendarView; date?: string; agenda?: string }) => {
    const nextAgenda = next.agenda ?? agenda;
    setSearchParams(
      { view: next.view ?? view, date: next.date ?? date, ...(nextAgenda !== ALL_AGENDAS && { agenda: nextAgenda }) },
      { replace: true },
    );
  };

  const days = getVisibleDays(view, date);
  const appointmentsQuery = useAppointments({ from: days[0], to: days.at(-1) }, { keepPrevious: true });
  const { data: allSchedules = [] } = useSchedules();
  const { data: blockedTimes = [] } = useBlockedTimes();
  const { clientsById, servicesById } = useLookups();
  // ?appointment=<id> (enlace del email "Comprobante de pago"): abre la ficha de esa cita.
  const dialogs = useAppointmentDialogs(searchParams.get("appointment"));

  const appointments = (appointmentsQuery.data ?? []).filter(
    (appointment) =>
      (showCancelled || appointment.status !== "cancelled") && (agenda === ALL_AGENDAS || appointment.professionalId === agenda),
  );
  const schedules = agenda === ALL_AGENDAS ? allSchedules : allSchedules.filter((s) => s.professionalId === agenda);
  const { startHour, endHour } = getHourRange(schedules, appointments);
  const professionalsById = new Map(agendas.all.map((p) => [p.id, p]));
  // Arrastrar citas pendientes o confirmadas a otra hora, otro día o (vista Día) otro profesional.
  const moveAppointment = useMoveAppointment();
  const move: ComponentProps<typeof TimeGridView>["move"] = can("appointments.manage")
    ? {
        canMove: (appointment) => appointment.status === "pending" || appointment.status === "confirmed",
        check: (appointment, target) => {
          if (target.date < now.date || (target.date === now.date && target.start < now.minutes)) return "Esa hora ya pasó";
          const professional = professionalsById.get(target.professionalId);
          if (!professional?.isActive) return `${professional?.displayName ?? "Ese profesional"} está inactivo`;
          if (!offersService(professional, appointment.serviceId)) {
            return `${professional.displayName} no atiende ${servicesById.get(appointment.serviceId)?.name ?? "este servicio"}`;
          }
          const busy = (appointmentsQuery.data ?? []).some(
            (other) =>
              other.id !== appointment.id &&
              other.date === target.date &&
              other.professionalId === target.professionalId &&
              BLOCKING_STATUSES.has(other.status) &&
              timeToMinutes(other.startTime) < target.end &&
              target.start < timeToMinutes(other.endTime),
          );
          return busy ? "Esa hora ya está ocupada" : null;
        },
        onMove: (appointment, target) => {
          const startTime = minutesToTime(target.start);
          const moved = { ...appointment, date: target.date, startTime, endTime: minutesToTime(target.end), professionalId: target.professionalId };
          const otherAgenda = target.professionalId !== appointment.professionalId ? professionalsById.get(target.professionalId) : undefined;
          void moveAppointment(
            appointment,
            moved,
            `Cita movida al ${formatDate(target.date, "EEEE d 'de' MMMM")} a las ${startTime}${otherAgenda ? ` con ${otherAgenda.displayName}` : ""}`,
          );
        },
      }
    : undefined;
  // Columnas: con un profesional elegido, sus días; con todas las agendas en la vista Día, una por profesional
  // (también las inactivas que tengan citas ese día).
  const columns: GridColumn[] | undefined =
    agenda !== ALL_AGENDAS
      ? days.map((day) => ({ key: day, day, professionalId: agenda }))
      : view === "day" && agendas.multiple
        ? agendas.all
            .filter((p) => p.isActive || appointments.some((a) => a.professionalId === p.id))
            .map((p) => ({ key: p.id, day: date, professionalId: p.id, heading: p }))
        : undefined;
  // En el móvil la rejilla de varias columnas no cabe: la semana y el día con todas las agendas van en tarjetas.
  const asCards = !isDesktop && (view === "week" || (view === "day" && columns !== undefined && columns.length > 1));

  return (
    <div className="space-y-5">
      <PageTitle title="Agenda" />
      <PageHeader
        title="Agenda"
        description={
          agendas.multiple ? "Las citas de todos los profesionales, por día, semana o mes." : "Gestiona tus citas por día, semana o mes."
        }
        actions={
          <>
            {can("schedule.manage") && (
              <Button size="lg" variant="outline" onClick={() => setBlockDialogOpen(true)}>
                <CalendarOff /> Bloquear horario
              </Button>
            )}
            <Button
              size="lg"
              onClick={() =>
                dialogs.openCreate({
                  date: view === "day" ? date : undefined,
                  professionalId: agenda !== ALL_AGENDAS ? agenda : undefined,
                })
              }
            >
              <Plus /> Nueva cita
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border bg-background p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Periodo anterior"
              onClick={() => navigate({ date: shiftDate(view, date, -1) })}
            >
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate({ date: now.date })}>
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Periodo siguiente"
              onClick={() => navigate({ date: shiftDate(view, date, 1) })}
            >
              <ChevronRight />
            </Button>
          </div>
          <h2 className="text-base font-semibold sm:text-lg" aria-live="polite">
            {getRangeLabel(view, date)}
          </h2>
          {appointmentsQuery.isFetching && !appointmentsQuery.isPending && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Actualizando" />
          )}
        </div>
        <Tabs value={view} onValueChange={(value) => navigate({ view: value as CalendarView })}>
          <TabsList>
            {CALENDAR_VIEWS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="px-3">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {agendas.multiple && (
          <ProfessionalSelect
            aria-label="Profesional"
            className="sm:w-72"
            professionals={agendas.selectable}
            value={agenda}
            onValueChange={(value) => navigate({ agenda: value })}
            allLabel="Todos los profesionales"
          />
        )}
        <StatusLegend />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showCancelled} onCheckedChange={setShowCancelled} size="sm" />
          Mostrar canceladas
        </label>
      </div>

      {appointmentsQuery.isPending ? (
        <Skeleton className="h-[560px] rounded-xl" />
      ) : appointmentsQuery.isError ? (
        <ErrorState onRetry={() => appointmentsQuery.refetch()} />
      ) : (
        <>
          {appointments.length === 0 && (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-background p-4 sm:flex-row sm:items-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <CalendarCheck className="size-5" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="font-medium">Tu agenda está libre</p>
                <p className="text-sm text-muted-foreground">Agenda tu primera cita para comenzar.</p>
              </div>
              <Button onClick={() => dialogs.openCreate({ date: view === "day" ? date : undefined })}>
                <Plus /> Crear cita
              </Button>
            </div>
          )}

          {view === "month" ? (
            <MonthView
              days={days}
              month={date.slice(0, 7)}
              today={now.date}
              appointments={appointments}
              blockedTimes={blockedTimes.filter((block) => block.professionalId === null || block.professionalId === agenda)}
              clientsById={clientsById}
              onDayClick={(day) => navigate({ view: "day", date: day })}
              onAppointmentClick={dialogs.openDetails}
            />
          ) : asCards ? (
            <>
              {view === "day" && (
                <p className="text-sm text-muted-foreground">
                  Elige un profesional para ver su horario por horas{move ? " y mover citas arrastrándolas" : ""}.
                </p>
              )}
              <AgendaListView
                days={days}
                appointments={appointments}
                blockedTimes={
                  agenda === ALL_AGENDAS
                    ? blockedTimes
                    : blockedTimes.filter((block) => block.professionalId === null || block.professionalId === agenda)
                }
                professionalsById={agendas.multiple && agenda === ALL_AGENDAS ? professionalsById : undefined}
                today={now.date}
                clientsById={clientsById}
                servicesById={servicesById}
                onAppointmentClick={dialogs.openDetails}
                onDayClick={(day) => navigate({ view: "day", date: day })}
              />
            </>
          ) : (
            <TimeGridView
              key={`${view}-${days[0]}`}
              days={days}
              appointments={appointments}
              blockedTimes={blockedTimes}
              schedules={schedules}
              columns={columns}
              professionalsById={agendas.multiple ? professionalsById : undefined}
              now={now}
              startHour={startHour}
              endHour={endHour}
              clientsById={clientsById}
              servicesById={servicesById}
              onSlotClick={(day, startTime, professionalId) =>
                dialogs.openCreate({ date: day, startTime, professionalId: professionalId ?? (agenda !== ALL_AGENDAS ? agenda : undefined) })
              }
              onAppointmentClick={dialogs.openDetails}
              move={move}
            />
          )}
        </>
      )}

      {dialogs.dialogs}
      <BlockedTimeFormDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        defaultDate={date}
        defaultProfessionalId={agenda !== ALL_AGENDAS ? agenda : null}
      />
    </div>
  );
}
