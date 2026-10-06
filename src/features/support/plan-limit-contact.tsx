import { SupportContact } from "@/components/shared/support-contact";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { DEFAULT_SUPPORT_EMAIL } from "@/lib/constants/app";
import { useSupportMessage } from "./use-open-support";

/**
 * "soporte@… o al WhatsApp …", para los avisos de límite: los planes y sus precios no se muestran en
 * la aplicación (se acuerdan con la plataforma), así que se invita a escribir.
 */
export function PlanLimitContact() {
  const { data: settings } = usePlatformSettings();
  return (
    <SupportContact
      email={settings?.supportEmail ?? DEFAULT_SUPPORT_EMAIL}
      phone={settings?.supportPhone}
      message={useSupportMessage()}
    />
  );
}
