import { ArrowLeft, Download, Loader2, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricStrip } from "@/features/dashboard/metric-strip";
import { PlanLimitContact } from "@/features/support/plan-limit-contact";
import { downloadCsv } from "@/lib/csv";
import { MAX_IMPORT_BYTES, type ImportClassification } from "@/lib/validations/client-import";
import type { ClientImportRow } from "@/types";
import { errorRowsTable, formatCount, issuesOf } from "./import-data";
import { ImportIssues } from "./import-issues";

/** No sabemos si la API terminó (se cortó la conexión): repetir no duplica. */
export const UNCERTAIN_IMPORT =
  "No sabemos si la importación terminó. Revisa la lista de pacientes o vuelve a importar el mismo archivo: los que ya se importaron no se repiten.";

/**
 * Paso 3: lo que pasará antes de importar, con las mismas reglas que la API: cuántos se importarán, cuántos
 * ya existían, cuáles tienen errores (con la fila y el motivo), cuáles están repetidos en el archivo y
 * cuántos no entran por el tope del plan.
 */
export function ReviewStep({
  rows,
  review,
  bytes,
  remaining,
  clientName,
  importing,
  uncertain,
  onBack,
  onImport,
}: {
  rows: ClientImportRow[];
  review: ImportClassification;
  bytes: number;
  /** Pacientes que aún caben en el plan (null: sin tope). */
  remaining: number | null;
  clientName: (clientId: string) => string | undefined;
  importing: boolean;
  uncertain: boolean;
  onBack: () => void;
  onImport: () => void;
}) {
  const tooBig = bytes > MAX_IMPORT_BYTES;
  const issues = issuesOf(review, clientName);
  const metrics = [
    { label: "Se importarán", value: formatCount(review.created) },
    { label: "Ya existían", value: formatCount(review.existing.length), hint: "No se cambian" },
    { label: "Con errores", value: formatCount(review.errors.length) },
    { label: "Repetidas en el archivo", value: formatCount(review.repeated.length) },
    { label: "No entran por el tope de tu plan", value: formatCount(review.overLimit.length) },
  ];

  return (
    <div className="space-y-6">
      <MetricStrip metrics={metrics} className="xl:grid-cols-5 2xl:grid-cols-5" />

      {remaining !== null && review.overLimit.length > 0 && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {remaining === 0
            ? "Llegaste al tope de pacientes de tu plan: no se puede importar ninguno. "
            : remaining === 1
              ? "Tu plan permite 1 paciente más: se importará el primero. "
              : `Tu plan permite ${formatCount(remaining)} pacientes más: se importarán los ${formatCount(remaining)} primeros. `}
          Para ampliarlo, escríbenos a <PlanLimitContact />.
        </p>
      )}

      {tooBig && (
        <p role="alert" className="flex gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Los datos son demasiado grandes para importarlos de una vez (por ejemplo, notas muy largas). Pártelo en dos archivos.
        </p>
      )}

      {issues.length > 0 && (
        <section aria-labelledby="import-issues" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="import-issues" className="font-semibold">
              Lo que no se importará
            </h2>
            {review.errors.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => downloadCsv(errorRowsTable(review, rows), "filas-con-errores.csv")}>
                <Download /> Descargar las filas con errores
              </Button>
            )}
          </div>
          <ImportIssues issues={issues} />
        </section>
      )}

      {uncertain && (
        <p role="alert" className="flex gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {UNCERTAIN_IMPORT}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          <ArrowLeft /> Volver a las columnas
        </Button>
        <Button size="lg" onClick={onImport} disabled={importing || tooBig || review.created === 0} aria-busy={importing}>
          {importing ? <Loader2 className="animate-spin" aria-hidden /> : <Upload />}
          {importing ? "Importando…" : `Importar ${formatCount(review.created)} ${review.created === 1 ? "paciente" : "pacientes"}`}
        </Button>
      </div>
    </div>
  );
}
