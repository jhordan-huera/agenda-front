import { useCallback, useRef, type RefObject } from "react";
import { DataError } from "@/lib/data";

/**
 * CAPTCHA de la página de reservas y del registro (Cloudflare Turnstile), en modo "sólo si hace
 * falta": casi nadie lo ve; si Cloudflare duda, aparece una casilla para marcar. Cada token sirve
 * para una sola petición, así que `getToken` pide uno nuevo cada vez (cada intento de reservar).
 * Sin `siteKey` (la API no lo pide) no carga nada y `getToken` devuelve undefined.
 */

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Si hay que marcar la casilla, tiempo para hacerlo. */
const TOKEN_TIMEOUT_MS = 120_000;
const FAILED_MESSAGE =
  "No pudimos comprobar que no eres un robot. Revisa tu conexión (o desactiva el bloqueador de anuncios) y recarga la página.";
const TIMEOUT_MESSAGE = "Se acabó el tiempo para la verificación. Inténtalo de nuevo.";

/** Errores con el mensaje para el paciente (getErrorMessage sólo muestra el de un DataError). */
const captchaError = (message = FAILED_MESSAGE) => new DataError("captcha", message);

/**
 * Clases de la caja del CAPTCHA. Turnstile la rellena aunque no se vea nada, así que sólo toma
 * espacio (y margen hasta el botón) cuando Cloudflare pide marcar la casilla.
 */
export const CAPTCHA_BOX_CLASS = "flex justify-center empty:hidden data-[interactive]:mb-4";

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(captchaError()));
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(captchaError());
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface PendingToken {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

/** Entrega el token (o el error) a la petición que lo espera. */
function settle(pending: RefObject<PendingToken | null>, outcome: { token: string } | { error: Error }) {
  const current = pending.current;
  pending.current = null;
  if (!current) return;
  if ("token" in outcome) current.resolve(outcome.token);
  else current.reject(outcome.error);
}

export function useCaptcha(siteKey: string | null) {
  const widget = useRef<Promise<{ api: TurnstileApi; id: string }> | null>(null);
  const pending = useRef<PendingToken | null>(null);
  const used = useRef(false);

  /**
   * Ref de la caja del CAPTCHA. El widget vive lo que vive su caja: al confirmar la reserva la
   * caja sale de la pantalla y se elimina; con "Reservar otra cita" vuelve y se crea otro.
   */
  const containerRef = useCallback(
    (container: HTMLDivElement | null) => {
      if (!siteKey || !container) return;
      let widgetId: string | null = null;
      let removed = false;
      const ready = loadTurnstile().then((api) => {
        if (removed) throw captchaError();
        widgetId = api.render(container, {
          sitekey: siteKey,
          execution: "execute",
          appearance: "interaction-only",
          language: "es",
          callback: (token: string) => settle(pending, { token }),
          "error-callback": () => settle(pending, { error: captchaError() }),
          "timeout-callback": () => settle(pending, { error: captchaError(TIMEOUT_MESSAGE) }),
          // Cloudflare pide marcar la casilla: la caja se marca (para darle espacio, ver CAPTCHA_BOX_CLASS)
          // y se lleva a la vista (en el móvil podía quedar fuera de la pantalla).
          "before-interactive-callback": () => {
            container.dataset.interactive = "true";
            setTimeout(() => container.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
          },
        });
        return { api, id: widgetId };
      });
      ready.catch(() => undefined);
      widget.current = ready;
      used.current = false;
      return () => {
        removed = true;
        if (widget.current === ready) widget.current = null;
        if (widgetId) window.turnstile?.remove(widgetId);
      };
    },
    [siteKey],
  );

  /** Un token nuevo para la próxima petición (undefined si no hay CAPTCHA). */
  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!siteKey) return undefined;
    if (!widget.current) throw captchaError();
    const { api, id } = await widget.current;
    settle(pending, { error: captchaError() });
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => settle(pending, { error: captchaError(TIMEOUT_MESSAGE) }), TOKEN_TIMEOUT_MS);
      pending.current = {
        resolve: (token) => {
          clearTimeout(timer);
          resolve(token);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      if (used.current) api.reset(id);
      used.current = true;
      api.execute(id);
    });
  }, [siteKey]);

  return { containerRef, getToken };
}
