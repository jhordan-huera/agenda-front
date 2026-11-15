/**
 * «Reservar mi control» (spec 051): el email y el WhatsApp abren la página de reservas con `?servicio=…&profesional=…`.
 * Devuelve lo que se puede usar (null si el servicio falta o tiene otro formato; el profesional, sólo si tiene su
 * formato). La página usa el servicio si está en la página y el profesional si lo atiende. Con `espera` es el enlace de
 * la lista de espera (readWaitlistOffer). Función pura: la comprueba `npm run check:control-reminders`.
 */
export interface ServiceLink {
  serviceId: string;
  professionalId: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readServiceLink(params: URLSearchParams): ServiceLink | null {
  if (params.has("espera")) return null;
  const serviceId = params.get("servicio") ?? "";
  if (!UUID.test(serviceId)) return null;
  const professionalId = params.get("profesional") ?? "";
  return { serviceId, professionalId: UUID.test(professionalId) ? professionalId : null };
}
