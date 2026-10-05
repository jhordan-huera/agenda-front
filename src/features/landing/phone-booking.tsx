import { cn } from "@/lib/utils";

const SLOTS = ["08:00", "09:00", "11:00", "15:00", "16:30", "17:30"];
const CHOSEN = "11:00";

/** Lo que ve el cliente en su celular: las horas libres y la que eligió, resaltada. */
export function PhoneBooking() {
  return (
    <div
      role="img"
      aria-label="Página de reservas en un celular: el cliente elige las 11:00 del jueves"
      className="w-[15.5rem] rotate-2 rounded-[2.25rem] border-[9px] border-foreground bg-background p-4 shadow-[0_28px_56px_-28px_rgb(29_36_51/0.4)]"
    >
      <div aria-hidden className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-foreground/15" />
      <p className="text-lg leading-tight font-extrabold tracking-[-0.02em]">Centro Profesional</p>
      <p className="text-xs text-muted-foreground">Consulta inicial, 1 h</p>
      <p className="mt-4 text-sm font-semibold">Jueves 8 de octubre</p>
      <div aria-hidden className="mt-2 grid grid-cols-3 gap-1.5">
        {SLOTS.map((slot) => (
          <span
            key={slot}
            className={cn(
              "flex h-9 items-center justify-center rounded-md border text-sm font-bold text-ink tabular-nums",
              slot === CHOSEN && "border-ink",
            )}
          >
            <span className={cn(slot === CHOSEN && "marker")}>{slot}</span>
          </span>
        ))}
      </div>
      <span aria-hidden className="mt-4 flex h-9 items-center justify-center rounded-md bg-ink text-sm font-semibold text-white">
        Continuar
      </span>
      <p aria-hidden className="mt-2 text-center text-[11px] text-muted-foreground">
        Sin crear cuenta
      </p>
    </div>
  );
}
