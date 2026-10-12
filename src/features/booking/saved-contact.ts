/**
 * Los datos del propio paciente guardados en su navegador (si marca «Recordar mis datos»): así, la
 * próxima vez no los escribe otra vez. Nunca salen de este dispositivo ni los da la API (la página
 * no dice si una cédula ya es de un cliente). El almacenamiento puede no estar disponible (modo
 * privado, bloqueado): entonces simplemente no se recuerda nada.
 */

const STORAGE_KEY = "agenda360:mis-datos";

export interface SavedContact {
  documentId: string;
  name: string;
  email: string;
  phone: string;
}

const isText = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;

export function loadSavedContact(): SavedContact | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== "object" || saved === null) return null;
    const { documentId, name, email, phone } = saved as Record<string, unknown>;
    if (!isText(documentId, 20) || !isText(name, 120) || !isText(email, 254) || !isText(phone, 30)) return null;
    return { documentId, name, email, phone };
  } catch {
    return null;
  }
}

export function saveContact(contact: SavedContact): void {
  try {
    const { documentId, name, email, phone } = contact;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ documentId, name, email, phone }));
  } catch {
    // Sin almacenamiento disponible: se reserva igual, sólo que no se recuerda.
  }
}

export function forgetSavedContact(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada guardado que borrar.
  }
}
