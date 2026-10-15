import { isAppleMobile, isStandalone } from "@/features/install/install-prompt";
import { PUSH_SNOOZE_DAYS } from "@/lib/constants/push";

/**
 * Qué puede este navegador con los avisos en el celular (spec 013, R17), sin preguntarle nada a la API:
 * - `dev`: en `npm run dev` no hay service worker (sólo en la versión compilada);
 * - `ios-install`: iPhone o iPad sin la app instalada (en iPhone sólo llegan con la app en la pantalla de inicio);
 * - `ios-old`: instalada, pero sin `PushManager` (iOS anterior a 16.4);
 * - `unsupported`: sin service worker, `PushManager` o `Notification` (p. ej. el navegador de otra app);
 * - `denied`: la persona bloqueó los avisos de este sitio;
 * - `ready`: se pueden activar.
 */
export type PushSupport = "dev" | "ios-install" | "ios-old" | "unsupported" | "denied" | "ready";

export function getPushSupport(): PushSupport {
  if (import.meta.env.DEV) return "dev";
  const apple = isAppleMobile();
  const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (apple && !isStandalone()) return "ios-install";
  if (apple && !capable) return "ios-old";
  if (!capable) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ready";
}

/** Con pantalla táctil: «en este celular»; si no, «en esta computadora». */
export function deviceLabel(): { here: string; noun: string } {
  const touch = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return touch ? { here: "en este celular", noun: "celular" } : { here: "en esta computadora", noun: "computadora" };
}

/** Qué pasos dar para volver a permitir los avisos, según el navegador. */
export type BrowserFamily = "chrome" | "firefox" | "safari" | "iphone";

export function browserFamily(): BrowserFamily {
  const ua = navigator.userAgent;
  if (isAppleMobile()) return "iphone";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua)) return "safari";
  return "chrome";
}

/** Safari (Mac, iPhone y iPad): para volver a suscribirse hace falta un toque de la persona. */
export const isSafari = () => browserFamily() === "safari" || browserFamily() === "iphone";

/* ------------------------------------------- Lo que recuerda este aparato -- */

/** «Ahora no»: no se vuelve a ofrecer en este aparato durante 7 días. */
const SNOOZE_KEY = "agenda360:avisos-ahora-no";
/** Esta persona pulsó «Desactivar en este celular»: no se ofrece ni se reactiva sola aquí. */
const turnedOffKey = (userId: string) => `agenda360:avisos-desactivados:${userId}`;

// Sin almacenamiento (navegación privada): el aviso vuelve a salir en cada visita, como InstallAppCard.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento disponible: no se recuerda.
  }
}

export function isSnoozed(now = Date.now()): boolean {
  const since = Number(read(SNOOZE_KEY));
  return Number.isFinite(since) && since > 0 && now - since < PUSH_SNOOZE_DAYS * 86_400_000;
}

export const snooze = () => write(SNOOZE_KEY, String(Date.now()));

export const wasTurnedOff = (userId: string) => read(turnedOffKey(userId)) === "1";

export const markTurnedOff = (userId: string, off: boolean) => write(turnedOffKey(userId), off ? "1" : null);

/* ----------------------------------------------------------- La clave -- */

/** La clave pública VAPID (base64url) en bytes, como la pide `pushManager.subscribe`. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64url.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** La suscripción de este navegador es con esta clave (si cambió, hay que volver a suscribirse, R2). */
export function sameKey(current: ArrayBuffer | null | undefined, expected: Uint8Array): boolean {
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index]);
}
