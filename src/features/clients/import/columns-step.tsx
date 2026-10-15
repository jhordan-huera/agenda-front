import { ArrowLeft, ArrowRight, TriangleAlert } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { assignColumn, hasNameColumn, IMPORT_COLUMNS, MAX_IMPORT_ROWS, type ImportTarget } from "@/lib/validations/client-import";
import { columnTitles, dataRowCount, formatCount, samplesOf } from "./import-data";
import type { SpreadsheetSheet } from "./read-spreadsheet";

/**
 * Paso 2: la hoja (si el Excel tiene varias) y a qué dato va cada columna. Las columnas con nombres
 * habituales ya vienen asignadas; cada una es una tarjeta (en el celular, una debajo de otra).
 */
export function ColumnsStep({
  fileName,
  sheets,
  sheetIndex,
  headerIndex,
  columns,
  onSheet,
  onColumns,
  onBack,
  onNext,
}: {
  fileName: string;
  sheets: SpreadsheetSheet[];
  sheetIndex: number;
  headerIndex: number;
  columns: ImportTarget[];
  onSheet: (index: number) => void;
  onColumns: (columns: ImportTarget[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const sheetId = useId();
  const sheet = sheets[sheetIndex];
  const titles = headerIndex >= 0 ? columnTitles(sheet, headerIndex) : [];
  const rowCount = headerIndex >= 0 ? dataRowCount(sheet, headerIndex) : 0;
  const tooMany = rowCount > MAX_IMPORT_ROWS;
  const missingName = rowCount > 0 && !hasNameColumn(columns);
  const problem = rowCount === 0
    ? "Esta hoja no tiene filas con datos debajo de los títulos. Llena la plantilla o elige otra hoja."
    : tooMany
      ? `El archivo tiene ${formatCount(rowCount)} filas con datos: el máximo es ${formatCount(MAX_IMPORT_ROWS)} por importación. Pártelo en dos archivos.`
      : missingName
        ? "Elige qué columna tiene el nombre completo (o los nombres y los apellidos) para seguir."
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-semibold">{fileName}</p>
          <p className="text-sm text-muted-foreground">
            {headerIndex >= 0
              ? `Títulos en la fila ${headerIndex + 1} · ${formatCount(rowCount)} ${rowCount === 1 ? "fila" : "filas"} con datos`
              : "La hoja está vacía"}
          </p>
        </div>
        {sheets.length > 1 && (
          <div className="grid gap-2 sm:w-64">
            <Label htmlFor={sheetId}>Hoja</Label>
            <Select value={String(sheetIndex)} onValueChange={(value) => onSheet(Number(value))}>
              <SelectTrigger id={sheetId} className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {sheets.map((option, index) => (
                  <SelectItem key={`${option.name}-${index}`} value={String(index)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {titles.length > 0 && (
        <section aria-labelledby={`${sheetId}-columns`} className="space-y-3">
          <div className="space-y-1">
            <h2 id={`${sheetId}-columns`} className="font-semibold">
              ¿Qué dato es cada columna?
            </h2>
            <p className="text-sm text-muted-foreground">
              Las que tienen nombres habituales ya están asignadas. «Añadir a las notas» guarda la columna en las notas con su
              título, por ejemplo «Fecha de nacimiento: 12/03/1990».
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {titles.map((title, index) => {
              const samples = samplesOf(sheet, headerIndex, index);
              const target = columns[index] ?? "ignore";
              return (
                <li
                  key={`${sheetIndex}-${index}`}
                  className={cn("min-w-0 space-y-3 rounded-xl border bg-card p-4", target === "ignore" && "bg-muted/40")}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{title}</p>
                    <p className="truncate text-sm text-muted-foreground">{samples.length > 0 ? samples.join(" · ") : "Sin datos"}</p>
                  </div>
                  <Select value={target} onValueChange={(value) => onColumns(assignColumn(columns, index, value as ImportTarget))}>
                    <SelectTrigger aria-label={`Qué dato es la columna «${title}»`} className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {IMPORT_COLUMNS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {problem && (
        <p role="alert" className="flex gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {problem}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft /> Elegir otro archivo
        </Button>
        <Button size="lg" onClick={onNext} disabled={Boolean(problem)}>
          Revisar {formatCount(rowCount)} {rowCount === 1 ? "fila" : "filas"} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
