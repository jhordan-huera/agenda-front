import { getSupportWhatsAppUrl } from "@/lib/whatsapp";

interface SupportContactProps {
  email: string;
  /** Teléfono de soporte; si está vacío sólo se muestra el email. */
  phone?: string;
  /** Mensaje con el que se abre el chat de WhatsApp. */
  message: string;
}

/** "soporte@x.com o al WhatsApp 099 406 0669", con enlaces, para usar dentro de un texto. */
export function SupportContact({ email, phone, message }: SupportContactProps) {
  const whatsAppUrl = phone ? getSupportWhatsAppUrl(phone, message) : null;
  return (
    <>
      <a href={`mailto:${email}`} className="font-medium text-primary hover:underline">
        {email}
      </a>
      {phone && whatsAppUrl && (
        <>
          {" "}
          o al WhatsApp{" "}
          <a href={whatsAppUrl} target="_blank" rel="noreferrer" className="font-medium whitespace-nowrap text-primary hover:underline">
            {phone}
          </a>
        </>
      )}
    </>
  );
}
