import { Link } from "react-router";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { formatDate } from "@/lib/format";
import { addDaysISO, startOfWeekISO } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Appointment, ISODate } from "@/types";

const MAX_CHIPS = 3;

/** Resumen visual de la semana actual: un bloque por día con sus citas. */
export function WeekOverview({ appointments, today }: { appointments: Appointment[]; today: ISODate }) {
  const weekStart = startOfWeekISO(today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const active = appointments.filter((a) => a.status !== "cancelled");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Esta semana</CardTitle>
        <CardDescription>Toca un día para verlo en la agenda.</CardDescription>
        <CardAction>
          <Link to="/dashboard/calendar?view=week" className="text-sm font-medium text-primary hover:underline">
            Ver semana
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ol className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((day) => {
            const dayAppointments = active.filter((a) => a.date === day);
            const isToday = day === today;
            return (
              <li key={day}>
                <Link
                  to={`/dashboard/calendar?view=day&date=${day}`}
                  aria-label={`${formatDate(day, "EEEE d")}: ${dayAppointments.length} citas`}
                  className={cn(
                    "flex h-full min-h-28 flex-col gap-1 rounded-lg border p-1.5 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-2",
                    isToday && "border-primary bg-accent/60 hover:bg-accent",
                    day < today && "opacity-70",
                  )}
                >
                  <span className="text-[11px] text-muted-foreground uppercase">
                    <span className="sm:hidden">{formatDate(day, "EEEEE")}</span>
                    <span className="hidden sm:inline">{formatDate(day, "EEE")}</span>
                  </span>
                  <span className={cn("text-sm font-semibold", isToday && "text-primary")}>{formatDate(day, "d")}</span>
                  <span className="mt-1 text-lg leading-none font-semibold tabular-nums sm:text-xl">
                    {dayAppointments.length}
                    <span className="ml-1 hidden text-xs font-normal text-muted-foreground sm:inline">
                      {dayAppointments.length === 1 ? "cita" : "citas"}
                    </span>
                    <span className="sr-only sm:hidden">citas</span>
                  </span>
                  <span className="mt-auto hidden flex-col gap-0.5 md:flex">
                    {dayAppointments.slice(0, MAX_CHIPS).map((appointment) => (
                      <span key={appointment.id} className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                        <span className={cn("size-1.5 rounded-full", APPOINTMENT_STATUS_CONFIG[appointment.status].dot)} />
                        {appointment.startTime}
                      </span>
                    ))}
                    {dayAppointments.length > MAX_CHIPS && (
                      <span className="text-[11px] text-primary">+{dayAppointments.length - MAX_CHIPS}</span>
                    )}
                  </span>
                  <span className="mt-auto flex flex-wrap gap-0.5 md:hidden" aria-hidden>
                    {dayAppointments.slice(0, 4).map((appointment) => (
                      <span key={appointment.id} className={cn("size-1.5 rounded-full", APPOINTMENT_STATUS_CONFIG[appointment.status].dot)} />
                    ))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
