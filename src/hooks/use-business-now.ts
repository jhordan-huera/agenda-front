import { useEffect, useState } from "react";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { getZonedNow, type ZonedNow } from "@/lib/time";

/**
 * Fecha/hora actual en la zona horaria del negocio. Se actualiza cada minuto
 * y devuelve el mismo objeto entre actualizaciones (estable para useMemo).
 */
export function useBusinessNow(timezone: string = DEFAULT_TIMEZONE): ZonedNow {
  const [state, setState] = useState(() => ({ timezone, now: getZonedNow(timezone) }));

  useEffect(() => {
    const interval = setInterval(() => setState({ timezone, now: getZonedNow(timezone) }), 60_000);
    return () => clearInterval(interval);
  }, [timezone]);

  // La zona horaria cambió (p. ej. cargó el negocio): se recalcula durante el render.
  if (state.timezone !== timezone) {
    const next = { timezone, now: getZonedNow(timezone) };
    setState(next);
    return next.now;
  }
  return state.now;
}
