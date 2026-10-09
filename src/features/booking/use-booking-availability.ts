import { useMemo } from "react";
import { useBusinessNow } from "@/hooks/use-business-now";
import { getAvailableSlotsForAny } from "@/lib/availability";
import { addDaysISO } from "@/lib/time";
import type { ISODate, PublicBusinessProfile, PublicService } from "@/types";

/**
 * Disponibilidad para el servicio elegido con uno o varios profesionales (varios: "el primero
 * disponible", la unión de sus horas). La fecha y la hora seleccionadas se derivan de lo realmente
 * disponible: si una hora se ocupa (p. ej. otra persona reservó), deja de estar seleccionada sin
 * efectos adicionales. La hora vale sólo para el día en que se eligió (`requestedDate`): si ese día
 * se queda sin huecos, la hora pasa a null en vez de saltar a otro día.
 */
export function useBookingAvailability(
  profile: PublicBusinessProfile,
  service: PublicService | undefined,
  professionalIds: string[],
  requestedDate: ISODate | null,
  requestedTime: string | null,
) {
  const now = useBusinessNow(profile.business.timezone);
  const { schedules, busySlots, blockedTimes, business } = profile;
  const { maxAdvanceDays } = business.bookingSettings;
  const agendasKey = professionalIds.join(",");

  const context = useMemo(
    () => ({ schedules, busySlots, blockedTimes, settings: business.bookingSettings, now }),
    [schedules, busySlots, blockedTimes, business.bookingSettings, now],
  );

  const availableDates = useMemo(() => {
    const dates = new Set<ISODate>();
    if (!service) return dates;
    const ids = agendasKey ? agendasKey.split(",") : [];
    for (let offset = 0; offset <= maxAdvanceDays; offset++) {
      const day = addDaysISO(now.date, offset);
      if (getAvailableSlotsForAny(day, service.durationMinutes, context, ids).length > 0) dates.add(day);
    }
    return dates;
  }, [service, now.date, maxAdvanceDays, context, agendasKey]);

  // El día pedido se conserva mientras se pueda reservar (aunque ya no le queden huecos: se avisa
  // de que la hora no está disponible en vez de cambiar de día sin decirlo). Si no hay día pedido
  // o ya pasó, el primer día con huecos (el Set conserva el orden cronológico).
  const lastDate = addDaysISO(now.date, maxAdvanceDays);
  const date =
    requestedDate && requestedDate >= now.date && requestedDate <= lastDate
      ? requestedDate
      : (availableDates.values().next().value ?? null);

  const slots = useMemo(
    () =>
      service && date
        ? getAvailableSlotsForAny(date, service.durationMinutes, context, agendasKey ? agendasKey.split(",") : [])
        : [],
    [service, date, context, agendasKey],
  );
  const time = requestedTime && requestedDate === date && slots.includes(requestedTime) ? requestedTime : null;

  return { today: now.date, availableDates, date, slots, time };
}
