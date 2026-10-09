import { createContext, useContext } from "react";
import type { AppointmentNoticeKind } from "@/lib/whatsapp";
import type { Appointment } from "@/types";

/**
 * Propone avisar al cliente por WhatsApp tras un cambio de su cita. Lo provee el panel
 * (WhatsAppNoticeProvider); fuera de él no hace nada. `previous`: la cita antes del cambio, para
 * saber si además le llega un email.
 */
export type OfferWhatsAppNotice = (appointment: Appointment, kind: AppointmentNoticeKind | null, previous?: Appointment) => void;

export const WhatsAppNoticeContext = createContext<OfferWhatsAppNotice>(() => {});

export const useOfferWhatsAppNotice = () => useContext(WhatsAppNoticeContext);
