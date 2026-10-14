import type { BookingPerson, PublicBookingInput } from "@/lib/validations/booking";
import type { HomeVisitAddress, PublicService } from "@/types";
import { loadSavedContact } from "./saved-contact";

/**
 * Datos del cliente y lugar de la cita. Viven en el flujo de reserva y se guardan con cada cambio:
 * se conservan al volver atrás o si la hora elegida deja de estar disponible.
 */
export type ContactValues = Pick<
  PublicBookingInput,
  "documentId" | "name" | "email" | "phone" | "extraPatients" | "notes" | "homeVisit" | "isVirtual"
> & {
  /** Domicilio marcado antes de cambiar a "en el local" o virtual: se recupera si vuelve a elegir a domicilio. */
  lastHomeVisit: HomeVisitAddress | null;
  /** Guardar sus datos en este navegador al reservar (ver saved-contact.ts). */
  remember: boolean;
  /** Los datos vienen de los que guardó en este navegador (se le ofrece olvidarlos). */
  fromSaved: boolean;
};

export const EMPTY_CONTACT: ContactValues = {
  documentId: "",
  name: "",
  email: "",
  phone: "",
  extraPatients: [],
  notes: "",
  homeVisit: null,
  isVirtual: false,
  lastHomeVisit: null,
  // Desmarcada: en un equipo compartido (recepción, el celular de un familiar) sus datos no quedan
  // para el siguiente. Si ya los había guardado, sigue marcada.
  remember: false,
  fromSaved: false,
};

export const EMPTY_PERSON: BookingPerson = { documentId: "", name: "", email: "", phone: "" };

/**
 * Las otras personas de la sesión (servicio en pareja o en familia): las que pide el servicio, además
 * de quien reserva. Una página guardada antes de que existieran no trae el dato: 0.
 */
export const otherPeopleOf = (service: Pick<PublicService, "peoplePerSession">) => Math.max(0, (service.peoplePerSession ?? 1) - 1);

/** "Para 2 personas" en los servicios en pareja o en familia; "" en los individuales. */
export const peopleLabel = (service: Pick<PublicService, "peoplePerSession">) =>
  otherPeopleOf(service) > 0 ? `Para ${otherPeopleOf(service) + 1} personas` : "";

/** Los datos de partida: los que el paciente guardó en este navegador, si los hay. */
export function initialContact(): ContactValues {
  const saved = loadSavedContact();
  return saved ? { ...EMPTY_CONTACT, ...saved, remember: true, fromSaved: true } : EMPTY_CONTACT;
}
