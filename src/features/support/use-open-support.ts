import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { APP_NAME, DEFAULT_SUPPORT_EMAIL } from "@/lib/constants/app";
import { getSupportWhatsAppUrl } from "@/lib/whatsapp";

/** Mensaje con el que se abre el chat de soporte para ampliar lo contratado. */
export function useSupportMessage(): string {
  const { data: business } = useCurrentBusiness();
  return `Hola, quiero ampliar lo que tengo contratado para ${business?.name ?? "mi negocio"} en ${APP_NAME}.`;
}

/** Abre WhatsApp (o el email) de soporte con el mensaje ya escrito: para botones y toasts. */
export function useOpenSupport(): () => void {
  const { data: settings } = usePlatformSettings();
  const message = useSupportMessage();
  return () => {
    const whatsApp = settings?.supportPhone ? getSupportWhatsAppUrl(settings.supportPhone, message) : null;
    const email = settings?.supportEmail ?? DEFAULT_SUPPORT_EMAIL;
    window.open(whatsApp ?? `mailto:${email}?body=${encodeURIComponent(message)}`, "_blank", "noopener");
  };
}
