import { CalendarOff, ChevronRight, Home, Video } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReceiptBadge } from "@/features/appointments/receipt-badge";
import { getBlockedRanges } from "@/lib/availability";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { capitalize, formatDate, formatTimeRange, plural } from "@/lib/format";
import { minutesToTime, timeToMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Appointment, BlockedTime, Client, ISODate, Professional, Service } from "@/types";

interface AgendaListViewProps {
  days: ISODate[];
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
  /** Con varias agendas a la vez: quién atiende cada cita (y de quién es cada bloqueo). */
  professionalsById?: Map<string, Pick<Professional, "displayName" | "color">>;
  today: ISODate;
  clientsById: Map<string, Client>;
  servicesById: Map<string, Service>;
  onAppointmentClick: (appointment: Appointment) => void;
  /** Tocar la cabecera de un día (vista Semana) abre ese día. */
  onDayClick: (day: ISODate) => void;
}

type Item =
  | { kind: "appointment"; start: number; appointment: Appointment }
  | { kind: "block"; start: number; end: number; block: BlockedTime };

/**
 * La agenda en tarjetas para el móvil, donde la rejilla no cabe: la semana agrupada por días o, en la
 * vista Día con todas las agendas, las citas de todos los profesionales por hora.
 */
export function AgendaListView({ days, today, onDayClick, ...props }: AgendaListViewProps) {
  if (days.length === 1) return <DayItems day={days[0]} {...props} />;
  return (
    <div className="space-y-5">
      {days.map((day) => {
        const count = props.appointments.filter((a) => a.date === day).length;
        const isToday = day === today;
        return (
          <section key={day} aria-label={capitalize(formatDate(day, "EEEE d 'de' MMMM"))} className="space-y-2">
            <button
              type="button"
              onClick={() => onDayClick(day)}
              className="flex w-full items-center gap-3 rounded-lg py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 flex-col items-center justify-center rounded-full border bg-background leading-none",
                  isToday && "border-primary bg-primary text-primary-foreground",
                )}
              >
                <span className="text-[10px] uppercase">{formatDate(day, "EEE")}</span>
                <span className="text-sm font-bold">{formatDate(day, "d")}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {capitalize(formatDate(day, "EEEE d 'de' MMMM"))}
                  {isToday && <span className="ml-1.5 text-sm font-medium text-primary">· Hoy</span>}
                </span>
                <span className="block text-sm text-muted-foreground">{count ? plural(count, "cita", "citas") : "Sin citas"}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            <DayItems day={day} {...props} />
          </section>
        );
      })}
    </div>
  );
}

function DayItems({
  day,
  appointments,
  blockedTimes,
  professionalsById,
  clientsById,
  servicesById,
  onAppointmentClick,
}: Omit<AgendaListViewProps, "days" | "today" | "onDayClick"> & { day: ISODate }) {
  const items: Item[] = [
    ...blockedTimes.flatMap((block) =>
      getBlockedRanges([block], day).map((range): Item => ({ kind: "block", start: range.start, end: range.end, block })),
    ),
    ...appointments
      .filter((a) => a.date === day)
      .map((appointment): Item => ({ kind: "appointment", start: timeToMinutes(appointment.startTime), appointment })),
  ].sort((a, b) => a.start - b.start || (a.kind === "block" ? -1 : 1));
  if (items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        if (item.kind === "block") {
          const owner = item.block.professionalId ? professionalsById?.get(item.block.professionalId) : undefined;
          return (
            <li
              key={`${item.block.id}-${day}`}
              className="bg-hatch flex items-center gap-2.5 rounded-xl border border-dashed bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground"
            >
              <CalendarOff className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-foreground tabular-nums">
                  {item.block.allDay ? "Todo el día" : formatTimeRange(minutesToTime(item.start), minutesToTime(item.end))}
                </span>
                {" · "}
                {item.block.reason || "Bloqueado"}
                {owner && ` · ${owner.displayName}`}
              </span>
            </li>
          );
        }
        const { appointment } = item;
        const status = APPOINTMENT_STATUS_CONFIG[appointment.status];
        const clientName = clientsById.get(appointment.clientId)?.name ?? "Cliente";
        const serviceName = servicesById.get(appointment.serviceId)?.name ?? "";
        const professional = professionalsById?.get(appointment.professionalId);
        const cancelled = appointment.status === "cancelled";
        return (
          <li key={appointment.id}>
            <button
              type="button"
              onClick={() => onAppointmentClick(appointment)}
              className="relative flex w-full items-start gap-3 overflow-hidden rounded-xl border bg-background py-3 pr-3 pl-4 text-left shadow-xs transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", status.dot)} />
              <span className="w-12 shrink-0 tabular-nums">
                <span className="block text-base leading-tight font-bold text-ink">{appointment.startTime}</span>
                <span className="block text-xs text-muted-foreground">{appointment.endTime}</span>
              </span>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className={cn("flex items-center gap-1.5 font-semibold", cancelled && "text-muted-foreground line-through")}>
                  {appointment.homeVisit && <Home className="size-3.5 shrink-0" aria-label="A domicilio" />}
                  {appointment.isVirtual && <Video className="size-3.5 shrink-0" aria-label="Virtual" />}
                  <span className="truncate">{clientName}</span>
                </span>
                {serviceName && <span className="block truncate text-sm text-muted-foreground">{serviceName}</span>}
                {professional && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: professional.color }} />
                    <span className="truncate">{professional.displayName}</span>
                  </span>
                )}
                <span className="flex flex-wrap gap-1.5 pt-1">
                  <StatusBadge status={appointment.status} />
                  <ReceiptBadge appointment={appointment} />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
