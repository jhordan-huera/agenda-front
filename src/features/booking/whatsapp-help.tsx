import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { getMinNoticeHours } from "@/lib/availability";
import { getBusinessWhatsAppUrl } from "@/lib/whatsapp";
import type { Business } from "@/types";

/**
 * Ayuda personal: el cliente escribe al profesional por WhatsApp, p. ej. para una cita
 * con menos anticipación de la permitida online (el profesional sí puede agendarla).
 */
export function WhatsAppHelp({ business }: { business: Business }) {
  const url = getBusinessWhatsAppUrl(business);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-start gap-3 rounded-xl border bg-background p-4 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <WhatsAppIcon className="mt-0.5 size-5 shrink-0" />
      <span>
        <span className="block font-medium">¿Necesitas ayuda para reservar?</span>
        <span className="block text-muted-foreground">
          Escríbenos por WhatsApp. Si necesitas una cita con menos de {getMinNoticeHours(business.bookingSettings)} horas de
          anticipación, te ayudamos a agendarla.
        </span>
      </span>
    </a>
  );
}
