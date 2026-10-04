import { WEEK_DAYS } from "@/lib/constants/business";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Appointment, BlockedTime, Client, ISODate } from "@/types";

const MAX_VISIBLE = 3;

interface MonthViewProps {
  days: ISODate[];
  month: string;
  today: ISODate;
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
  clientsById: Map<string, Client>;
  onDayClick: (date: ISODate) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function MonthView({
  days,
  month,
  today,
  appointments,
  blockedTimes,
  clientsById,
  onDayClick,
  onAppointmentClick,
}: MonthViewProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEK_DAYS.map((day) => (
          <div key={day.value} className="py-2 text-center text-xs font-medium text-muted-foreground uppercase">
            {day.short}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 [grid-auto-rows:minmax(5.5rem,1fr)] sm:[grid-auto-rows:minmax(7rem,1fr)]">
        {days.map((day) => {
          const dayAppointments = appointments.filter((a) => a.date === day);
          const inMonth = day.startsWith(month);
          const isToday = day === today;
          const blocked = blockedTimes.some((b) => b.allDay && b.startDate <= day && day <= b.endDate);
          const hidden = dayAppointments.length - MAX_VISIBLE;

          return (
            <div
              key={day}
              onClick={() => onDayClick(day)}
              className={cn(
                "group flex cursor-pointer flex-col gap-1 border-r border-b p-1 transition-colors hover:bg-muted/40 sm:p-1.5 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/30",
                blocked && "bg-hatch",
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDayClick(day);
                }}
                aria-label={`Ver ${formatDate(day, "EEEE d 'de' MMMM")}: ${dayAppointments.length} citas`}
                className={cn(
                  "flex size-7 items-center justify-center self-start rounded-full text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                  !inMonth && "text-muted-foreground/60",
                  isToday && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {formatDate(day, "d")}
              </button>

              {blocked && <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">Bloqueado</span>}

              <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {dayAppointments.slice(0, MAX_VISIBLE).map((appointment) => (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(appointment);
                    }}
                    className={cn(
                      "flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                      appointment.status === "cancelled" && "text-muted-foreground line-through",
                    )}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", APPOINTMENT_STATUS_CONFIG[appointment.status].dot)} />
                    <span className="text-muted-foreground tabular-nums">{appointment.startTime}</span>
                    <span className="truncate">{clientsById.get(appointment.clientId)?.name ?? "Cliente"}</span>
                  </button>
                ))}
                {hidden > 0 && <span className="px-1 text-[11px] font-medium text-primary">+{hidden} más</span>}
              </div>

              {dayAppointments.length > 0 && (
                <div className="flex flex-wrap gap-0.5 px-1 sm:hidden" aria-hidden>
                  {dayAppointments.slice(0, 6).map((appointment) => (
                    <span
                      key={appointment.id}
                      className={cn("size-1.5 rounded-full", APPOINTMENT_STATUS_CONFIG[appointment.status].dot)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
