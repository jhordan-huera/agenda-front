import { CLOSE_LATER_HOURS } from "@/lib/constants/appointment-status";

/**
 * «Más tarde» en la pantalla «Antes de seguir, cierra tus citas pendientes» (spec 018): se recuerda en
 * este aparato, para esta persona y este negocio, durante CLOSE_LATER_HOURS. Es una preferencia de la
 * pantalla, no un cambio de datos: no va a la actividad. Sin almacenamiento (navegación privada), vale
 * mientras la pestaña siga abierta; al volver a abrir el panel, la pantalla sale otra vez.
 */
const keyOf = (userId: string, businessId: string) => `agenda360:por-cerrar-mas-tarde:${userId}:${businessId}`;

const LATER_MS = CLOSE_LATER_HOURS * 3_600_000;

/** Lo de esta pestaña, por si el navegador no deja guardar nada. */
const inMemory = new Map<string, number>();

function readSince(key: string): number {
  try {
    const stored = Number(localStorage.getItem(key));
    if (Number.isFinite(stored) && stored > 0) return stored;
  } catch {
    // Sin almacenamiento: queda lo de esta pestaña.
  }
  return inMemory.get(key) ?? 0;
}

/** Pulsó «Más tarde» en las últimas 4 horas en este aparato. */
export function isClosingLater(userId: string, businessId: string, now = Date.now()): boolean {
  const since = readSince(keyOf(userId, businessId));
  return since > 0 && now >= since && now - since < LATER_MS;
}

export function closeLater(userId: string, businessId: string, now = Date.now()): void {
  const key = keyOf(userId, businessId);
  inMemory.set(key, now);
  try {
    localStorage.setItem(key, String(now));
  } catch {
    // Sin almacenamiento: vale lo de esta pestaña.
  }
}
