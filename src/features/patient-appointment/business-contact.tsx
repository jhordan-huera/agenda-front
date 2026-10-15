import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { getCantAttendWhatsAppUrl } from "@/lib/whatsapp";
import type { PublicAppointment } from "@/types";

/**
 * Para avisar al negocio que no podrá ir (spec 010): el mensaje y, si tiene teléfono, WhatsApp con el
 * aviso ya escrito y «Llamar». Es un enlace wa.me: lo envía el paciente, nada de WhatsApp por API.
 */
export function BusinessContact({ appointment, message }: { appointment: PublicAppointment; message: string }) {
  const { business } = appointment;
  const whatsAppUrl = getCantAttendWhatsAppUrl(business, appointment);
  return (
    <div className="space-y-3">
      <p>{message}</p>
      {business.phone && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {whatsAppUrl && (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href={whatsAppUrl} target="_blank" rel="noreferrer">
                <WhatsAppIcon /> Escribir por WhatsApp
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}>
              <Phone /> Llamar
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
