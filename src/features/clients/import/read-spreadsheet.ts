import { decodeCsv, parseCsv } from "@/lib/csv";

/**
 * Lee en el navegador el archivo de la importación de pacientes (spec 012): un Excel (.xlsx) o un
 * CSV. El archivo no se sube ni se guarda: de aquí salen sus hojas como texto, una fila por cada fila
 * de la hoja (las vacías del medio se conservan: así el número de fila es el que muestra Excel).
 */

export interface SpreadsheetSheet {
  name: string;
  /** Las celdas de cada fila, como texto ya recortado ("" si está vacía). */
  rows: string[][];
}

/** Un archivo que no se puede importar, con el mensaje para quien lo eligió. */
export class SpreadsheetError extends Error {}

/** Tamaño máximo del archivo, antes de leerlo. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Lo que Excel muestra cuando una fórmula falla: la celda se lee vacía. */
const EXCEL_ERRORS = new Set(["#N/A", "#REF!", "#VALUE!", "#DIV/0!", "#NAME?", "#NUM!", "#NULL!"]);

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * El valor que se ve de una celda, como texto: los números tal cual (912345675 → «912345675», el 0 de
 * la cédula lo devuelve la limpieza), las fechas como «dd/mm/aaaa» (en UTC, para que no cambie el
 * día), «Sí» o «No», y vacío si es un error de Excel.
 */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${pad(value.getUTCDate())}/${pad(value.getUTCMonth() + 1)}/${value.getUTCFullYear()}`;
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = String(value).trim();
  return EXCEL_ERRORS.has(text) ? "" : text;
}

/** La extensión, en minúsculas ("" si no tiene). */
const extensionOf = (name: string) => (name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "");

/**
 * Las hojas del archivo. El lector de Excel (read-excel-file) se descarga sólo aquí, al elegir un
 * .xlsx: ni el panel ni la página de importar lo cargan antes, y un CSV no lo necesita.
 */
export async function readSpreadsheet(file: File): Promise<{ sheets: SpreadsheetSheet[] }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new SpreadsheetError("El archivo pesa más de 10 MB. Guarda sólo la hoja de los pacientes y vuelve a intentarlo.");
  }
  const extension = extensionOf(file.name);
  if (extension === "csv") {
    const rows = parseCsv(decodeCsv(await file.arrayBuffer())).map((row) => row.map(cellText));
    return { sheets: [{ name: file.name.replace(/\.csv$/i, ""), rows }] };
  }
  if (extension !== "xlsx") {
    throw new SpreadsheetError("Guárdalo como .xlsx o .csv desde Excel (Archivo → Guardar como) y vuelve a intentarlo.");
  }
  try {
    const { default: readExcelFile } = await import("read-excel-file/browser");
    const sheets = await readExcelFile(file);
    return { sheets: sheets.map(({ sheet, data }) => ({ name: sheet, rows: data.map((row) => row.map(cellText)) })) };
  } catch {
    throw new SpreadsheetError("No se pudo leer el archivo. Ábrelo en Excel y guárdalo de nuevo como .xlsx.");
  }
}
