import type { PublicBookingInput } from "@/lib/validations/booking";
import type { HomeVisitAddress } from "@/types";

/**
 * Datos del cliente y lugar de la cita. Viven en el flujo de reserva y se guardan con cada cambio:
 * se conservan al volver atrás o si la hora elegida deja de estar disponible.
 */
export type ContactValues = Pick<PublicBookingInput, "documentId" | "name" | "email" | "phone" | "notes" | "homeVisit" | "isVirtual"> & {
  /** Cédula ya buscada (normalizada); "" mientras no se busque. */
  verifiedDocumentId: string;
  /** Si la cédula ya es de un cliente del negocio, su nombre para saludar ("María L."); si no, null. */
  knownClientName: string | null;
  /** Domicilio marcado antes de cambiar a "en el local" o virtual: se recupera si vuelve a elegir a domicilio. */
  lastHomeVisit: HomeVisitAddress | null;
};

export const EMPTY_CONTACT: ContactValues = {
  documentId: "",
  name: "",
  email: "",
  phone: "",
  notes: "",
  homeVisit: null,
  isVirtual: false,
  verifiedDocumentId: "",
  knownClientName: null,
  lastHomeVisit: null,
};
