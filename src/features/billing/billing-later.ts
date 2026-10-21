/**
 * «Más tarde» en la pantalla de la mensualidad (spec 029): vale para ese cobro y esta persona mientras dure
 * la sesión del navegador (sessionStorage): la pantalla vuelve a abrirse en su siguiente inicio de sesión
 * (al cerrar sesión se olvida, ver forgetBillingLater) o en otra pestaña. Sólo se ofrece dentro de los días
 * de gracia: pasados, la pantalla no se cierra aunque haya uno guardado (lo decide dashboard-layout.tsx con
 * `blocked`). Es una preferencia de la pantalla, no un cambio de datos: no va a la actividad.
 */
const PREFIX = "agenda360:mensualidad-mas-tarde:";
const keyOf = (userId: string, chargeId: string) => `${PREFIX}${userId}:${chargeId}`;

/** Lo de esta pestaña, por si el navegador no deja guardar nada (navegación privada). */
const inMemory = new Set<string>();

export function isBillingLater(userId: string, chargeId: string): boolean {
  const key = keyOf(userId, chargeId);
  try {
    if (sessionStorage.getItem(key) === "1") return true;
  } catch {
    // Sin almacenamiento: queda lo de esta pestaña.
  }
  return inMemory.has(key);
}

export function billingLater(userId: string, chargeId: string): void {
  const key = keyOf(userId, chargeId);
  inMemory.add(key);
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Sin almacenamiento: vale lo de esta pestaña.
  }
}

/** «Pagar ahora» en la tarjeta de la mensualidad: la pantalla vuelve a abrirse. */
export function clearBillingLater(userId: string, chargeId: string): void {
  const key = keyOf(userId, chargeId);
  inMemory.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Sin almacenamiento: ya se quitó lo de esta pestaña.
  }
}

/** Al cerrar sesión: en el siguiente inicio de sesión la pantalla vuelve a abrirse. */
export function forgetBillingLater(): void {
  inMemory.clear();
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(PREFIX)) sessionStorage.removeItem(key);
  } catch {
    // Sin almacenamiento: no hay nada guardado.
  }
}
