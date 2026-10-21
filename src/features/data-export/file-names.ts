/**
 * Los nombres de los archivos del ZIP de la descarga (spec 028): sin lo que Windows, macOS o Linux no
 * aceptan y sin repetidos dentro de cada carpeta. Cada historia lleva el nombre del paciente y su cédula
 * («Lucía Benítez - 0912345678.html»), tal como está escrito en su ficha.
 */

/** Lo que Windows no admite en un nombre (y tampoco conviene en macOS ni Linux), y los caracteres de control. */
// eslint-disable-next-line no-control-regex -- justamente los de control son los que se quitan.
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;
/** Nombres que Windows reserva: «CON.html» o «aux.pdf» no se pueden crear. */
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
/** Largo máximo del nombre, sin la extensión (las rutas largas fallan al descomprimir en Windows). */
const MAX_NAME = 80;
const MAX_EXTENSION = 10;

/** Un texto como nombre de archivo o de carpeta: sin lo prohibido, sin puntos ni espacios al final. */
export function safeFileName(text: string, fallback: string): string {
  const cleaned = text.normalize("NFC").replace(FORBIDDEN, " ").replace(/\s+/g, " ").trim();
  // Contado por caracteres (no por unidades de UTF-16): así no se parte una tilde compuesta ni un emoji.
  const name = Array.from(cleaned).slice(0, MAX_NAME).join("").replace(/^[.\s]+|[.\s]+$/g, "");
  if (!name) return fallback;
  return RESERVED.test(name) ? `${name}_` : name;
}

/** «Radiografía final.PDF» → ["Radiografía final", ".pdf"]; sin extensión (o rara), toda va en el nombre. */
export function splitExtension(fileName: string): [string, string] {
  const match = /^(.*?)(\.[a-z0-9]{1,10})$/i.exec(fileName.trim());
  return match && match[1] ? [match[1], match[2].toLowerCase().slice(0, MAX_EXTENSION + 1)] : [fileName, ""];
}

/** El nombre del archivo (y de la carpeta de sus adjuntos) de la historia de un paciente. */
export function patientFileName(client: { name: string; documentId: string }): string {
  return safeFileName(client.documentId ? `${client.name} - ${client.documentId}` : client.name, "Paciente");
}

/**
 * Reparte nombres sin repetir dentro de una carpeta: «Ana.html», «Ana (2).html»… Sin distinguir
 * mayúsculas: Windows y macOS las tratan como el mismo archivo.
 */
export function uniqueNames(): (name: string, extension?: string) => string {
  const used = new Set<string>();
  return (name, extension = "") => {
    let candidate = `${name}${extension}`;
    for (let copy = 2; used.has(candidate.toLocaleLowerCase("es")); copy++) candidate = `${name} (${copy})${extension}`;
    used.add(candidate.toLocaleLowerCase("es"));
    return candidate;
  };
}

/** Una ruta del ZIP como enlace relativo de una página: cada parte, con sus caracteres codificados. */
export const relativeHref = (path: string) => path.split("/").map(encodeURIComponent).join("/");
