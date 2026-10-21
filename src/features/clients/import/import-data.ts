import { formatCount } from "@/lib/format";
import {
  findHeaderRow,
  guessColumns,
  isEmptyImportRow,
  rowFromCells,
  type ImportTarget,
} from "@/lib/validations/client-import";
import type { ClientImportResult, ClientImportRow, ClientRequiredFields } from "@/types";
import { missingRowText } from "../missing-fields";
import type { SpreadsheetSheet } from "./read-spreadsheet";

/** «5.000»: ahora en lib/format.ts (también lo usa la API, spec 028). */
export { formatCount };

/** «Se importaron 190 pacientes» (o «Se importó 1 paciente»): el aviso y el resumen del resultado. */
export const importedText = (created: number) =>
  created === 1 ? "Se importó 1 paciente" : created === 0 ? "No se importó ningún paciente" : `Se importaron ${formatCount(created)} pacientes`;

/** La fila de títulos de una hoja y el destino sugerido de cada columna. */
export function setupFor(sheet: SpreadsheetSheet): { headerIndex: number; columns: ImportTarget[] } {
  const headerIndex = findHeaderRow(sheet.rows);
  if (headerIndex < 0) return { headerIndex, columns: [] };
  const guessed = guessColumns(sheet.rows[headerIndex]);
  return { headerIndex, columns: columnTitles(sheet, headerIndex).map((_, index) => guessed[index] ?? "ignore") };
}

/** La hoja que se propone: la primera con títulos reconocidos; si ninguna, la primera con datos. */
export function defaultSheetIndex(sheets: readonly SpreadsheetSheet[]): number {
  const recognized = sheets.findIndex((sheet) => {
    const { columns } = setupFor(sheet);
    return columns.filter((target) => target !== "ignore").length >= 2;
  });
  if (recognized >= 0) return recognized;
  return Math.max(0, sheets.findIndex((sheet) => sheet.rows.some((row) => row.some((cell) => cell !== ""))));
}

/** Los títulos de las columnas (los vacíos, «Columna N»). */
export function columnTitles(sheet: SpreadsheetSheet, headerIndex: number): string[] {
  const width = sheet.rows.slice(Math.max(headerIndex, 0)).reduce((max, row) => Math.max(max, row.length), 0);
  const headers = headerIndex >= 0 ? sheet.rows[headerIndex] : [];
  return Array.from({ length: width }, (_, index) => headers[index]?.trim() || `Columna ${index + 1}`);
}

/** Filas con algún dato debajo de los títulos (las que cuentan para el tope de 5.000). */
export function dataRowCount(sheet: SpreadsheetSheet, headerIndex: number): number {
  return sheet.rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cell !== "")).length;
}

/** Hasta dos valores de ejemplo de una columna, para reconocerla. */
export function samplesOf(sheet: SpreadsheetSheet, headerIndex: number, column: number): string[] {
  const samples: string[] = [];
  for (const row of sheet.rows.slice(headerIndex + 1)) {
    const value = row[column]?.replace(/\s+/g, " ").trim();
    if (value) samples.push(value);
    if (samples.length === 2) break;
  }
  return samples;
}

/**
 * Las filas que se mandan a la API: todas las no vacías de la hoja, también las que tienen errores
 * (así la API cuenta lo mismo). El número de fila es el que muestra Excel.
 */
export function importRowsOf(sheet: SpreadsheetSheet, headerIndex: number, columns: readonly ImportTarget[]): ClientImportRow[] {
  const titles = columnTitles(sheet, headerIndex);
  return sheet.rows
    .slice(headerIndex + 1)
    .map((cells, index) => rowFromCells(cells, titles, columns, headerIndex + 2 + index))
    .filter((row) => !isEmptyImportRow(row));
}

/** Los bytes del JSON que se manda (el tope es MAX_IMPORT_BYTES; la casilla no cuenta). */
export const payloadBytes = (rows: readonly ClientImportRow[]) => new TextEncoder().encode(JSON.stringify({ rows })).length;

/** Una fila de las listas de la revisión y del resultado: lo que no se importa o lo que entra por completar. */
export interface ImportIssue {
  row: number;
  kind: "error" | "existing" | "repeated" | "overLimit" | "incomplete";
  text: string;
  /** La ficha del paciente que ya existía. */
  clientId?: string;
}

export function issuesOf(result: ClientImportResult, clientName: (clientId: string) => string | undefined): ImportIssue[] {
  return [
    ...result.errors.map((error): ImportIssue => ({ row: error.row, kind: "error", text: error.reason })),
    ...result.existing.map((existing): ImportIssue => {
      const name = clientName(existing.clientId);
      return { row: existing.row, kind: "existing", text: name ? `Ya existía: ${name}` : "Ya existía", clientId: existing.clientId };
    }),
    ...result.repeated.map((repeated): ImportIssue => ({
      row: repeated.row,
      kind: "repeated",
      text: `Repetida: es la misma persona que la fila ${repeated.firstRow}`,
    })),
    ...result.overLimit.map((row): ImportIssue => ({ row, kind: "overLimit", text: "No entra por el tope de tu plan" })),
  ].sort((a, b) => a.row - b.row);
}

/** Los que entran «Por completar», con lo que le falta a cada uno («Falta la cédula y el email»). */
export const incompleteIssuesOf = (incomplete: ClientImportResult["incomplete"]): ImportIssue[] =>
  incomplete.map((entry) => ({ row: entry.row, kind: "incomplete", text: missingRowText(entry.missing) }));

/** «Descargar las filas con errores»: la fila, el motivo y sus datos, para corregirlas en Excel. */
export function errorRowsTable(result: ClientImportResult, rows: readonly ClientImportRow[]): string[][] {
  const byRow = new Map(rows.map((row) => [row.row, row]));
  return [
    ["Fila", "Motivo", "Nombre", "Cédula", "Email", "Teléfono", "Dirección", "Notas"],
    ...result.errors.map((error) => {
      const row = byRow.get(error.row);
      return [String(error.row), error.reason, row?.name ?? "", row?.documentId ?? "", row?.email ?? "", row?.phone ?? "", row?.address ?? "", row?.notes ?? ""];
    }),
  ];
}

/** «Para tu negocio son obligatorios el nombre, la cédula y el email.» */
export function requiredFieldsText(required: ClientRequiredFields): string {
  const names = [
    "el nombre",
    required.documentId && "la cédula",
    required.email && "el email",
    required.phone && "el teléfono",
    required.address && "la dirección",
  ].filter((name): name is string => Boolean(name));
  if (names.length === 1) return "Para tu negocio sólo es obligatorio el nombre.";
  return `Para tu negocio son obligatorios ${names.slice(0, -1).join(", ")} y ${names.at(-1)}.`;
}
