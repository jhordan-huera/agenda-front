/**
 * Leer y escribir CSV sin dependencias (spec 012): la importación de pacientes lee el archivo y la
 * exportación de la actividad y las filas con errores lo escriben. Sin alias `@/`: se puede probar
 * con Node.
 */

/**
 * El texto de un CSV: UTF-8 (sin el BOM) o, si no es UTF-8 válido, Windows-1252. Excel en Windows
 * guarda «CSV (delimitado por comas)» en Windows-1252 y sólo «CSV UTF-8» en UTF-8: sin esto, «Peña»
 * saldría «PeÃ±a» o con «�».
 */
export function decodeCsv(bytes: ArrayBuffer | Uint8Array): string {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    text = new TextDecoder("windows-1252").decode(data);
  }
  return text.replace(/^﻿/, "");
}

const SEPARATORS = [";", ",", "\t"] as const;

/** El separador: el que más aparece en la primera línea, fuera de comillas (Excel en español usa «;»). Si empatan, la coma. */
function detectSeparator(text: string): string {
  const counts = new Map<string, number>(SEPARATORS.map((separator) => [separator, 0]));
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && counts.has(char)) counts.set(char, counts.get(char)! + 1);
  }
  let best = ",";
  for (const [separator, count] of counts) if (count > counts.get(best)!) best = separator;
  return best;
}

/**
 * Las filas de un CSV (RFC 4180): un campo entre comillas puede tener el separador y saltos de línea,
 * y `""` es una comilla. Fin de línea `\r\n`, `\n` o `\r`; una última línea vacía se ignora. Cada fila
 * del resultado es un registro (lo que Excel muestra como una fila).
 */
export function parseCsv(text: string): string[][] {
  const separator = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === separator) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Celda CSV entre comillas. Las que empiezan por = + - @ se neutralizan (Excel las ejecutaría como fórmulas). */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Un CSV para Excel: separador «;» y BOM UTF-8, como lo espera Excel en español. */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return `﻿${rows.map((row) => row.map(cell).join(";")).join("\r\n")}`;
}

/** Descarga un CSV en el equipo de quien lo pide (no pasa por el servidor). */
export function downloadCsv(rows: readonly (readonly string[])[], fileName: string): void {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
