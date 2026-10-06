import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService, isTwoFactorChallenge, type Session } from "@/lib/auth";
import { setApiUnreachable } from "@/lib/connection-status";
import { DataError } from "@/lib/data/errors";
import { SessionContext, type SessionContextValue, type SessionStatus } from "./use-session";

/** Cada cuánto se vuelve a pedir la sesión si la API no responde al arrancar. */
const SESSION_RETRY_MS = 5000;

/** Negocio que el super admin está gestionando (por pestaña: sobrevive a recargar la página). */
const SUPPORT_KEY = "agendo:support-business";
type SupportBusiness = { id: string; name: string };

function readSupport(): SupportBusiness | null {
  try {
    const raw = sessionStorage.getItem(SUPPORT_KEY);
    return raw ? (JSON.parse(raw) as SupportBusiness) : null;
  } catch {
    return null;
  }
}

function writeSupport(business: SupportBusiness | null) {
  try {
    if (business) sessionStorage.setItem(SUPPORT_KEY, JSON.stringify(business));
    else sessionStorage.removeItem(SUPPORT_KEY);
  } catch {
    // Sin almacenamiento disponible: el modo soporte dura hasta recargar.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [support, setSupport] = useState<SupportBusiness | null>(readSupport);

  const applySession = useCallback((next: Session | null) => {
    setSession(next);
    setStatus(next ? "authenticated" : "unauthenticated");
    return next;
  }, []);

  const refresh = useCallback(async () => {
    const current = await authService.getSession().catch(() => null);
    if (!current) queryClient.clear();
    return applySession(current);
  }, [applySession, queryClient]);

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      clearTimeout(retry);
      authService.getSession().then(
        (current) => {
          setApiUnreachable(false);
          if (!cancelled) applySession(current);
        },
        (error: unknown) => {
          if (cancelled) return;
          // Sin conexión con la API (sin internet, o una wifi sin salida; p. ej. al abrir la app
          // instalada sin señal): se sigue en la pantalla de carga con el aviso y se reintenta, en
          // vez de mandar al login como si la sesión se hubiera cerrado.
          if (error instanceof DataError && error.code === "network") {
            setApiUnreachable(true);
            retry = setTimeout(load, SESSION_RETRY_MS);
            window.addEventListener("online", load, { once: true });
            return;
          }
          applySession(null);
        },
      );
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      window.removeEventListener("online", load);
    };
  }, [applySession]);

  useEffect(
    () =>
      // La API respondió 401 (sesión caducada o cerrada desde otro dispositivo): se vuelve a
      // leer la sesión y, si ya no existe, los layouts redirigen al login.
      queryClient.getQueryCache().subscribe((event) => {
        if (
          event.type === "updated" &&
          event.action.type === "error" &&
          event.action.error instanceof DataError &&
          event.action.error.code === "unauthorized"
        ) {
          void refresh();
        }
      }),
    [queryClient, refresh],
  );

  const updateSupport = useCallback((business: SupportBusiness | null) => {
    writeSupport(business);
    setSupport(business);
  }, []);

  // El modo soporte sólo existe para el super admin: el resto ve su sesión tal cual.
  const effectiveSession = useMemo<Session | null>(
    () =>
      session?.platformRole === "super_admin" && support
        ? {
            ...session,
            businessId: support.id,
            role: "owner",
            businessStatus: "active",
            // En modo soporte el super admin tiene el acceso del propietario, también a la historia clínica.
            clinicalAccess: true,
            professionalId: null,
            support: { businessName: support.name },
          }
        : session,
    [session, support],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session: effectiveSession,
      refresh,
      enterSupport: (business) => updateSupport({ id: business.id, name: business.name }),
      exitSupport: () => updateSupport(null),
      signIn: async (input) => {
        const result = await authService.signIn(input);
        return isTwoFactorChallenge(result) ? result : applySession(result)!;
      },
      verifyTwoFactor: async (input) => applySession(await authService.verifyTwoFactor(input))!,
      signUp: async (input) => applySession(await authService.signUp(input))!,
      signOut: async () => {
        await authService.signOut();
        updateSupport(null);
        queryClient.clear();
        applySession(null);
      },
    }),
    [status, effectiveSession, refresh, applySession, queryClient, updateSupport],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
