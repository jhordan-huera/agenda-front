/**
 * Tras un despliegue, una pestaña abierta desde antes pide las páginas de la versión anterior,
 * que ya no existen en el servidor. Ese error se detecta y la página se recarga una vez para
 * traer la versión nueva.
 */
const RELOAD_KEY = "agenda360:new-version-reload";
/** Si ya se recargó hace menos de esto, no se vuelve a recargar (evita bucles). */
const RELOAD_GUARD_MS = 10_000;

/** Mensajes de Chrome, Safari, Firefox y Vite cuando no llega una parte de la app. */
export function isStaleAssetError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|importing a module script failed|failed to load module script|unable to preload/i.test(
    message,
  );
}

/** Recarga la página salvo que se haya recargado hace un momento. Devuelve si recargó. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false; // Sin sessionStorage no se puede evitar un bucle: se muestra el error.
  }
  window.location.reload();
  return true;
}
