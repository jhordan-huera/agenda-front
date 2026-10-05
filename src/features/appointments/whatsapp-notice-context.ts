import { createContext, useContext } from "react";
import type { Appointment, WhatsAppNoticeKind } from "@/types";

/**
 * Propone avisar al cliente por WhatsApp tras un cambio de su cita. Lo provee el panel
 * (WhatsAppNoticeProvider); fuera de él no hace nada.
 */
export type OfferWhatsAppNotice = (appointment: Appointment, kind: WhatsAppNoticeKind | null) => void;

export const WhatsAppNoticeContext = createContext<OfferWhatsAppNotice>(() => {});

export const useOfferWhatsAppNotice = () => useContext(WhatsAppNoticeContext);
