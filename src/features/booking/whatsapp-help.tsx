import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { getMinNoticeHours } from "@/lib/availability";
import { getBusinessWhatsAppUrl } from "@/lib/whatsapp";
import type { PublicBusiness } from "@/types";

/**
 * Ayuda personal: el cliente escribe al profesional por WhatsApp, p. ej. para una cita
 * con menos anticipación de la permitida online (el profesional sí puede agendarla).
 */
export function WhatsAppHelp({ business }: { business: PublicBusiness }) {
  const url = getBusinessWhatsAppUrl(business);
  if (!url) return null;

  return (
    <div className="flex items-start gap-3 px-1 text-sm">
      <WhatsAppIcon className="mt-0.5 size-5 shrink-0" />
      <p className="text-muted-foreground">
        ¿Necesitas una cita con menos de {getMinNoticeHours(business.bookingSettings)} horas de anticipación o tienes una
        duda?{" "}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-ink underline underline-offset-4 outline-none hover:decoration-2 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Escríbenos por WhatsApp
        </a>
      </p>
    </div>
  );
}
