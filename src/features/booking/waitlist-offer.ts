import type { ISODate } from "@/types";

/**
 * «Reservar esta hora» (spec 047): el enlace del email de la lista de espera abre la página de reservas con
 * `?servicio=…&profesional=…&fecha=…&hora=…&espera=<token>`. Devuelve lo que se puede usar (null si falta algo
 * o tiene otro formato): la página elige el servicio, el profesional, la fecha y la hora, y con el token trae el
 * nombre, el email y el teléfono de quien espera. Función pura: la comprueba `npm run check:waitlist`.
 */
export interface WaitlistOffer {
  serviceId: string;
  professionalId: string;
  date: ISODate;
  time: string;
  token: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const TOKEN = /^[0-9a-f]{32}$/;

export function readWaitlistOffer(params: URLSearchParams): WaitlistOffer | null {
  const offer = {
    serviceId: params.get("servicio") ?? "",
    professionalId: params.get("profesional") ?? "",
    date: params.get("fecha") ?? "",
    time: params.get("hora") ?? "",
    token: params.get("espera") ?? "",
  };
  if (!UUID.test(offer.serviceId) || !UUID.test(offer.professionalId)) return null;
  if (!DATE.test(offer.date) || !TIME.test(offer.time) || !TOKEN.test(offer.token)) return null;
  return offer;
}
