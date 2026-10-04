import { CheckCircle2, TrendingUp } from "lucide-react";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00"];
const HOUR_HEIGHT = 52;

const EVENTS: { top: number; height: number; time: string; client: string; service: string; status: AppointmentStatus }[] = [
  { top: 0, height: 1, time: "09:00", client: "María López", service: "Consulta inicial", status: "confirmed" },
  { top: 1.5, height: 0.75, time: "10:30", client: "Carlos Pérez", service: "Seguimiento", status: "pending" },
  { top: 2.5, height: 1, time: "11:30", client: "Ana Torres", service: "Sesión estándar", status: "confirmed" },
  { top: 3.75, height: 0.75, time: "12:45", client: "Daniel Gómez", service: "Evaluación", status: "completed" },
];

/** Vista previa ilustrativa del producto (HTML/CSS, sin imágenes). */
export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
      <div className="rounded-2xl border bg-background shadow-2xl shadow-primary/10">
        <div className="flex items-center gap-1.5 border-b px-4 py-3">
          <span className="size-2.5 rounded-full bg-rose-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-xs text-muted-foreground">Agenda · Hoy</span>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Hoy</p>
              <p className="text-xs text-muted-foreground">5 citas programadas</p>
            </div>
            <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-[11px]">
              <span className="rounded-md bg-background px-2 py-0.5 font-medium shadow-sm">Día</span>
              <span className="px-2 py-0.5 text-muted-foreground">Semana</span>
              <span className="px-2 py-0.5 text-muted-foreground">Mes</span>
            </div>
          </div>
          <div className="relative grid grid-cols-[3rem_1fr]">
            <div>
              {HOURS.map((hour) => (
                <div key={hour} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-muted-foreground">
                  {hour}
                </div>
              ))}
            </div>
            <div className="relative border-l">
              {HOURS.map((hour) => (
                <div key={hour} style={{ height: HOUR_HEIGHT }} className="border-t border-dashed" />
              ))}
              {EVENTS.map((event) => (
                <div
                  key={event.time}
                  className={cn(
                    "absolute inset-x-2 overflow-hidden rounded-md border-l-[3px] px-2 py-1",
                    APPOINTMENT_STATUS_CONFIG[event.status].event,
                  )}
                  style={{ top: event.top * HOUR_HEIGHT + 2, height: event.height * HOUR_HEIGHT - 4 }}
                >
                  <p className="truncate text-[11px] font-semibold">{event.client}</p>
                  <p className="truncate text-[10px] opacity-75">
                    {event.time} · {event.service}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -top-5 -right-3 hidden rounded-xl border bg-background p-3 shadow-lg sm:block">
        <p className="text-[11px] text-muted-foreground">Ingresos del mes</p>
        <p className="flex items-center gap-2 text-lg font-semibold">
          $1,240
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
            <TrendingUp className="size-3" /> 12%
          </span>
        </p>
      </div>

      <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-xl border bg-background p-3 shadow-lg">
        <CheckCircle2 className="size-8 text-emerald-500" />
        <div>
          <p className="text-xs font-semibold">Nueva reserva online</p>
          <p className="text-[11px] text-muted-foreground">Sofía Martínez · Seguimiento · 16:30</p>
        </div>
      </div>
    </div>
  );
}
