/**
 * Las reglas de los avisos de errores de la web (spec 044): cómo se limpian la página, las rutas de la API y
 * los mensajes, y quién vio el error. Van en la parte que se descarga con el primer error (sentry-client.ts),
 * no en el arranque. Las prueba `npm run check:error-reports`.
 *
 * Nada de los pacientes (principio II): sin identificadores, tokens, emails, números largos ni parámetros, y
 * sin el nombre del negocio de su página de reservas ("/book/psicovalle" → "/book/[negocio]").
 */

/** Un tramo de la dirección que puede ser un dato: un identificador, un email, un número largo o un token. */
function cleanSegment(segment: string): string {
  let text = segment;
  try {
    text = decodeURIComponent(segment);
  } catch {
    // Un tramo mal codificado se mira tal cual.
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) return "[id]";
  if (text.includes("@")) return "[email]";
  if (/^\+?[\d\s().-]{7,}$/.test(text) && text.replace(/\D/g, "").length >= 7) return "[número]";
  if (/^(?=.*\d)[\w-]{16,}$/.test(text) || /^[0-9a-f]{16,}$/i.test(text)) return "[token]";
  return segment;
}

const cleanPath = (pathname: string) => pathname.split("?")[0].split("#")[0].split("/").map(cleanSegment).join("/");

/** La página: "/book/psicovalle" → "/book/[negocio]", "/cita/<token>" → "/cita/[token]" (también el pago y la lista de espera). */
export function errorPagePath(pathname: string): string {
  return cleanPath(pathname)
    .replace(/^\/book\/[^/]+/, "/book/[negocio]")
    .replace(/^\/(cita|pago|lista-de-espera)\/[^/]+/, "/$1/[token]");
}

/** Una ruta de la API: "/public/businesses/psicovalle/slots?…" → "/public/businesses/[negocio]/slots". */
export function errorApiPath(path: string): string {
  return cleanPath(path)
    .replace(/^\/public\/businesses\/[^/]+/, "/public/businesses/[negocio]")
    .replace(/^\/public\/(appointments|payments|waitlist)\/[^/]+/, "/public/$1/[token]")
    .replace(/^\/public\/referrals\/[^/]+/, "/public/referrals/[código]");
}

/** El mensaje sin datos de nadie: emails, números de 7 o más cifras y tokens largos tapados; hasta 300 caracteres. */
export function scrubMessage(message: string): string {
  return message
    .replace(/[^\s@"'<>(),;:]+@[^\s@"'<>(),;:]+\.[a-z]{2,}/gi, "[email]")
    .replace(/\+?\d(?:[\s.-]?\d){6,}/g, "[número]")
    .replace(/\b[0-9a-f]{24,}\b/gi, "[token]")
    .slice(0, 300);
}

/** Quién vio el error, sin decir quién es: «paciente» (reservas, pago, «Tu cita» y la lista de espera), «super admin», «equipo» o «visitante». */
export function userTypeFor(pathname: string, current: { superAdmin: boolean; signedIn: boolean }): string {
  if (/^\/(?:book|cita|pago|lista-de-espera)(?:\/|$)/.test(pathname)) return "paciente";
  if (current.superAdmin) return "super admin";
  return current.signedIn ? "equipo" : "visitante";
}
