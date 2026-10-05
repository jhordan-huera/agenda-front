import { useMemo } from "react";
import { useBusinessNow } from "@/hooks/use-business-now";
import { getAvailableDates, getAvailableSlots } from "@/lib/availability";
import type { ISODate, PublicBusinessProfile, PublicService } from "@/types";

/**
 * Disponibilidad para el servicio elegido. La fecha y la hora seleccionadas se
 * derivan de lo realmente disponible: si una hora se ocupa (p. ej. otra persona
 * reservó), deja de estar seleccionada sin efectos adicionales.
 */
export function useBookingAvailability(
  profile: PublicBusinessProfile,
  service: PublicService | undefined,
  requestedDate: ISODate | null,
  requestedTime: string | null,
) {
  const now = useBusinessNow(profile.business.timezone);
  const { schedules, busySlots, blockedTimes, business } = profile;
  const { maxAdvanceDays } = business.bookingSettings;

  const context = useMemo(
    () => ({ schedules, busySlots, blockedTimes, settings: business.bookingSettings, now }),
    [schedules, busySlots, blockedTimes, business.bookingSettings, now],
  );

  const availableDates = useMemo(
    () =>
      service ? getAvailableDates(now.date, maxAdvanceDays + 1, service.durationMinutes, context) : new Set<ISODate>(),
    [service, now.date, maxAdvanceDays, context],
  );

  // Por defecto, el primer día con huecos (el Set conserva el orden cronológico).
  const date =
    requestedDate && availableDates.has(requestedDate) ? requestedDate : (availableDates.values().next().value ?? null);

  const slots = useMemo(
    () => (service && date ? getAvailableSlots(date, service.durationMinutes, context) : []),
    [service, date, context],
  );
  const time = requestedTime && slots.includes(requestedTime) ? requestedTime : null;

  return { today: now.date, availableDates, date, slots, time };
}
