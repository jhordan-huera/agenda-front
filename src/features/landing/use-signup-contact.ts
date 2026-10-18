import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { queryKeys } from "@/hooks/queries/query-keys";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { APP_NAME } from "@/lib/constants/app";
import { data } from "@/lib/data";
import { getSupportWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Cómo empieza un profesional desde la portada (spec 022): con el registro público abierto, «Crear
 * cuenta» (/register); cerrado, «Quiero mi agenda», un WhatsApp al teléfono de soporte o, sin teléfono,
 * un email al de soporte, con el mensaje ya escrito.
 */
export type SignupContact = { kind: "register"; to: "/register" } | { kind: "whatsapp" | "email"; href: string };

/** El texto de los botones con el registro cerrado. */
export const SIGNUP_CONTACT_LABEL = "Quiero mi agenda";

/** Un enlace de reservas válido (como los de /book/:slug); cualquier otra cosa en `?desde=` se ignora. */
const SLUG_PATTERN = /^[a-z0-9-]{1,60}$/;
/** Un código de referidos (spec 023): 6 caracteres, letras sin I ni O y números del 2 al 9. */
const REFERRAL_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * El mensaje para el dueño: «Hola, quiero mi agenda en Agenda360» o, si llegó desde la página de un
 * negocio, «Hola, vi la página de reservas de <negocio> y quiero mi agenda en Agenda360». Con el enlace de
 * referidos de un negocio (spec 023) suma «Me recomendó <negocio> (código ABC234)»: con el código, el
 * dueño lo encuentra en «Recomendado por» al crear el negocio.
 */
export function buildSignupMessage({
  from,
  referrer,
}: { from?: string | null; referrer?: { name: string; code: string } | null } = {}): string {
  const base = from
    ? `Hola, vi la página de reservas de ${from} y quiero mi agenda en ${APP_NAME}`
    : `Hola, quiero mi agenda en ${APP_NAME}`;
  return referrer ? `${base}. Me recomendó ${referrer.name} (código ${referrer.code}).` : base;
}

/**
 * El contacto de los botones de la portada y de /register. Lee `?desde=<slug>` (el pie «Hecho con
 * Agenda360» de las páginas de los pacientes) y pide el nombre del negocio a su perfil público, que va en
 * la CDN; y `?ref=<código>` (el enlace para recomendar de la spec 023), cuyo nombre da
 * `/public/referrals/:code`, también en la CDN. Mientras llega la configuración (o si falla), los botones
 * llevan a /register, que vuelve a mirar si el registro está abierto.
 */
export function useSignupContact(): SignupContact {
  const [params] = useSearchParams();
  const settings = usePlatformSettings();
  const slug = params.get("desde")?.trim().toLowerCase() ?? "";
  const validSlug = SLUG_PATTERN.test(slug) ? slug : "";
  const code = params.get("ref")?.trim().toUpperCase() ?? "";
  const validCode = REFERRAL_CODE_PATTERN.test(code) ? code : "";
  const closed = settings.data ? !settings.data.allowPublicSignup : false;
  const fromName = useQuery({
    queryKey: queryKeys.publicProfile(validSlug),
    queryFn: () => data.publicBooking.getProfile(validSlug),
    enabled: closed && Boolean(validSlug),
    retry: false,
    staleTime: 5 * 60_000,
    select: (profile) => profile?.business.name ?? null,
  });
  const referrerName = useQuery({
    queryKey: queryKeys.referrer(validCode),
    queryFn: () => data.platform.getReferrer(validCode),
    enabled: closed && Boolean(validCode),
    retry: false,
    staleTime: 5 * 60_000,
    select: (referrer) => referrer?.name ?? null,
  });

  if (!settings.data || !closed) return { kind: "register", to: "/register" };
  const message = buildSignupMessage({
    from: fromName.data,
    referrer: referrerName.data ? { name: referrerName.data, code: validCode } : null,
  });
  const { supportPhone, supportEmail } = settings.data;
  const whatsAppUrl = supportPhone ? getSupportWhatsAppUrl(supportPhone, message) : null;
  if (whatsAppUrl) return { kind: "whatsapp", href: whatsAppUrl };
  const subject = encodeURIComponent(`${SIGNUP_CONTACT_LABEL} en ${APP_NAME}`);
  return { kind: "email", href: `mailto:${supportEmail}?subject=${subject}&body=${encodeURIComponent(message)}` };
}
