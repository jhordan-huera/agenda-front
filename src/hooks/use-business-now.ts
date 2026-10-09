import { useEffect, useState } from "react";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { getZonedNow, type ZonedNow } from "@/lib/time";

const MINUTE = 60_000;

/** Milisegundos hasta el próximo cambio de minuto (con un margen para no quedarse justo antes). */
const untilNextMinute = () => MINUTE - (Date.now() % MINUTE) + 50;

/**
 * Fecha/hora actual en la zona horaria del negocio. Se actualiza al cambiar el minuto (no cada 60 s
 * desde que se abrió la pantalla: la hora iba hasta un minuto atrasada) y al volver a la pestaña o
 * desbloquear el móvil, cuando los temporizadores pudieron quedar dormidos. Devuelve el mismo objeto
 * mientras no cambia (estable para useMemo).
 */
export function useBusinessNow(timezone: string = DEFAULT_TIMEZONE): ZonedNow {
  const [state, setState] = useState(() => ({ timezone, now: getZonedNow(timezone) }));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      clearTimeout(timer);
      setState((current) => {
        const now = getZonedNow(timezone);
        const same = current.timezone === timezone && current.now.date === now.date && current.now.minutes === now.minutes;
        return same ? current : { timezone, now };
      });
      timer = setTimeout(tick, untilNextMinute());
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tick();
    };
    timer = setTimeout(tick, untilNextMinute());
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [timezone]);

  // La zona horaria cambió (p. ej. cargó el negocio): se recalcula durante el render.
  if (state.timezone !== timezone) {
    const next = { timezone, now: getZonedNow(timezone) };
    setState(next);
    return next.now;
  }
  return state.now;
}
