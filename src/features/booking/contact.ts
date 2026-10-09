import type { PublicBookingInput } from "@/lib/validations/booking";
import type { HomeVisitAddress } from "@/types";
import { loadSavedContact } from "./saved-contact";

/**
 * Datos del cliente y lugar de la cita. Viven en el flujo de reserva y se guardan con cada cambio:
 * se conservan al volver atrás o si la hora elegida deja de estar disponible.
 */
export type ContactValues = Pick<PublicBookingInput, "documentId" | "name" | "email" | "phone" | "notes" | "homeVisit" | "isVirtual"> & {
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
  notes: "",
  homeVisit: null,
  isVirtual: false,
  lastHomeVisit: null,
  // Desmarcada: en un equipo compartido (recepción, el celular de un familiar) sus datos no quedan
  // para el siguiente. Si ya los había guardado, sigue marcada.
  remember: false,
  fromSaved: false,
};

/** Los datos de partida: los que el paciente guardó en este navegador, si los hay. */
export function initialContact(): ContactValues {
  const saved = loadSavedContact();
  return saved ? { ...EMPTY_CONTACT, ...saved, remember: true, fromSaved: true } : EMPTY_CONTACT;
}
