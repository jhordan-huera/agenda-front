import type { PublicBookingInput } from "@/lib/validations/booking";

/** Datos del cliente y lugar de la cita: se conservan al volver del paso "Confirmar". */
export type ContactValues = Pick<PublicBookingInput, "documentId" | "name" | "email" | "phone" | "notes" | "homeVisit"> & {
  /** Cédula ya buscada (normalizada); "" mientras no se busque. */
  verifiedDocumentId: string;
  /** Si la cédula ya es de un cliente del negocio, su nombre para saludar ("María L."); si no, null. */
  knownClientName: string | null;
};

export const EMPTY_CONTACT: ContactValues = {
  documentId: "",
  name: "",
  email: "",
  phone: "",
  notes: "",
  homeVisit: null,
  verifiedDocumentId: "",
  knownClientName: null,
};
