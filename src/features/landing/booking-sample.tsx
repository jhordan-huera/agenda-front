import type { CSSProperties } from "react";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { cn } from "@/lib/utils";
import { SCENE } from "./landing-constants";
import { Sheet } from "./sheet";

const DAYS = [
  { short: "mié", date: 7 },
  { short: "jue", date: 8, chosen: true },
  { short: "vie", date: 9 },
];
/** Las horas libres que le quedan al jueves de DaySample, después de las 10:40. */
const SLOTS = ["11:00", "14:00", "16:00"];
const CHOSEN = "11:00";

/**
 * Lo que ve el paciente en su celular al abrir el enlace que le llegó por WhatsApp (spec 030): el día y las
 * horas libres, y la que elige, marcada con el resaltador al cargar la portada (con «reducir movimiento»,
 * ya marcada). Datos de ejemplo; el texto para el lector de pantalla lo pone la portada.
 */
export function BookingSample({ className }: { className?: string }) {
  return (
    <Sheet lifted aria-hidden className={cn("rounded-[1.75rem] p-5", className)}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <WhatsAppIcon className="size-3.5" />
        Enlace recibido por WhatsApp
      </p>
      <div className="mt-4 flex items-center gap-3 border-t pt-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-ink">PR</span>
        <span className="min-w-0">
          <span className="block leading-tight font-semibold">Paula Ríos</span>
          <span className="block text-xs text-muted-foreground">Psicóloga clínica</span>
        </span>
      </div>
      <p className="mt-5 text-sm font-semibold">Consulta psicológica, 50 min</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        {DAYS.map((day) => (
          <span
            key={day.date}
            className={cn("rounded-lg border py-1.5 leading-tight", day.chosen ? "border-ink text-ink ring-1 ring-ink" : "text-muted-foreground")}
          >
            <span className="block text-[11px]">{day.short}</span>
            <span className="block text-sm font-bold tabular-nums">{day.date}</span>
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {SLOTS.map((slot) => (
          <span
            key={slot}
            className={cn(
              "flex h-9 items-center justify-center rounded-md border text-sm font-bold text-ink tabular-nums",
              slot === CHOSEN && "border-ink",
            )}
          >
            {slot === CHOSEN ? (
              <span className="marker marker-draw" style={{ "--marker-delay": `${SCENE.mark}s` } as CSSProperties}>
                {slot}
              </span>
            ) : (
              slot
            )}
          </span>
        ))}
      </div>
      <span className="mt-4 flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
        Reservar a las {CHOSEN}
      </span>
      <p className="mt-2.5 text-center text-xs text-muted-foreground">Sin crear cuenta: con tu cédula</p>
    </Sheet>
  );
}
