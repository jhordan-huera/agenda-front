import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useSession } from "@/features/auth/use-session";
import { useSetThemeMode } from "@/hooks/queries/use-account";
import type { ThemeMode } from "@/types";
import { applyTheme, devicePrefersDark, isPatientPath, readStoredMode, resolveMode, storeMode, subscribeDeviceMode } from "./theme-mode";
import { ThemeModeContext, ThemeRouteContext, type ThemeModeContextValue } from "./use-theme-mode";

/**
 * Aplica el modo de pantalla (spec 019, research R3) y lo da a la app con useThemeMode():
 * - con sesión, el de la cuenta; sin sesión o mientras carga, la última elección de este aparato
 *   (así no cambia a mitad de la carga) o, si no hay, el del aparato;
 * - en las páginas de los pacientes, siempre el del aparato;
 * - «Automático» cambia sin recargar cuando cambia el aparato.
 * public/theme-boot.js ya puso la clase antes de pintar, con la misma regla: aquí sólo se confirma.
 */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const { status, session } = useSession();
  const saveMode = useSetThemeMode();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [stored, setStored] = useState(readStoredMode);
  const prefersDark = useSyncExternalStore(subscribeDeviceMode, devicePrefersDark, () => false);

  const accountMode = status === "authenticated" ? session?.themeMode : undefined;
  // La elección de la cuenta pasa a ser la de este aparato: al cerrar la sesión, la portada y el login
  // siguen con ella.
  if (accountMode && accountMode !== stored) setStored(accountMode);
  const mode = accountMode ?? stored;
  const resolved = resolveMode(isPatientPath(pathname) ? "auto" : mode, prefersDark);

  useLayoutEffect(() => applyTheme(resolved), [resolved]);

  const remember = useCallback((next: ThemeMode) => {
    storeMode(next);
    setStored(next);
  }, []);

  // Y queda guardada en el aparato: el próximo arranque ya sale con ella (public/theme-boot.js).
  useEffect(() => {
    if (accountMode) storeMode(accountMode);
  }, [accountMode]);

  const saveAccountMode = saveMode.mutate;
  const setMode = useCallback(
    (next: ThemeMode) => (status === "authenticated" ? saveAccountMode(next) : remember(next)),
    [status, saveAccountMode, remember],
  );

  const value = useMemo<ThemeModeContextValue>(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return (
    <ThemeModeContext value={value}>
      <ThemeRouteContext value={setPathname}>{children}</ThemeRouteContext>
    </ThemeModeContext>
  );
}

/**
 * Dentro del router (RootLayout): le dice al proveedor en qué página se está, para que las de los
 * pacientes sigan al aparato también al llegar sin recargar (p. ej. desde la portada).
 */
export function ThemeRouteSync() {
  const { pathname } = useLocation();
  const setPathname = useContext(ThemeRouteContext);
  useLayoutEffect(() => setPathname?.(pathname), [pathname, setPathname]);
  return null;
}
