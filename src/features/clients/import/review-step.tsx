import { ArrowLeft, Download, Loader2, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MetricStrip } from "@/features/dashboard/metric-strip";
import { PlanLimitContact } from "@/features/support/plan-limit-contact";
import { downloadCsv } from "@/lib/csv";
import { MAX_IMPORT_BYTES, type ImportClassification } from "@/lib/validations/client-import";
import type { ClientImportResult, ClientImportRow } from "@/types";
import { errorRowsTable, formatCount, incompleteIssuesOf, issuesOf } from "./import-data";
import { ImportIssues } from "./import-issues";

/** No sabemos si la API terminó (se cortó la conexión): repetir no duplica. */
export const UNCERTAIN_IMPORT =
  "No sabemos si la importación terminó. Revisa la lista de pacientes o vuelve a importar el mismo archivo: los que ya se importaron no se repiten.";

/**
 * Paso 3: lo que pasará antes de importar, con las mismas reglas que la API: cuántos se importarán, cuántos
 * ya existían, cuáles tienen errores (con la fila y el motivo), cuáles están repetidos en el archivo y
 * cuántos no entran por el tope del plan. Aparte, los que tienen datos por completar (ampliación del
 * 2026-10-15) con la casilla «Importar también los que tienen datos por completar», encendida de entrada.
 */
export function ReviewStep({
  rows,
  review,
  incomplete,
  includeIncomplete,
  onIncludeIncomplete,
  bytes,
  remaining,
  clientName,
  importing,
  uncertain,
  onBack,
  onImport,
}: {
  rows: ClientImportRow[];
  /** Lo que pasará, con la casilla como está. */
  review: ImportClassification;
  /** Las filas con datos por completar que entrarían con la casilla (se muestran también con ella apagada). */
  incomplete: ClientImportResult["incomplete"];
  includeIncomplete: boolean;
  onIncludeIncomplete: (include: boolean) => void;
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
    { label: "Por completar", value: formatCount(review.incomplete.length), hint: review.incomplete.length > 0 ? "Entran igual" : undefined },
    { label: "Ya existían", value: formatCount(review.existing.length), hint: "No se cambian" },
    { label: "Con errores", value: formatCount(review.errors.length) },
    { label: "Repetidas en el archivo", value: formatCount(review.repeated.length) },
    { label: "No entran por el tope de tu plan", value: formatCount(review.overLimit.length) },
  ];

  return (
    <div className="space-y-6">
      <MetricStrip metrics={metrics} className="xl:grid-cols-6 2xl:grid-cols-6" />

      {remaining !== null && review.overLimit.length > 0 && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
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

      {incomplete.length > 0 && (
        <section aria-labelledby="import-incomplete" className="space-y-3">
          <div className="space-y-1">
            <h2 id="import-incomplete" className="font-semibold">
              {formatCount(incomplete.length)} con datos por completar
            </h2>
            <p className="text-sm text-muted-foreground">
              {incomplete.length === 1 ? "Le falta" : "Les falta"} algún dato obligatorio de tu negocio. Lo que traen se revisa
              igual: una cédula, un email o un teléfono mal escritos siguen con error.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
            <Checkbox
              id="import-include-incomplete"
              checked={includeIncomplete}
              onCheckedChange={(checked) => onIncludeIncomplete(checked === true)}
              disabled={importing}
              aria-describedby="import-include-incomplete-hint"
              className="mt-0.5"
            />
            <div className="min-w-0 space-y-1">
              <Label htmlFor="import-include-incomplete" className="leading-snug">
                Importar también los que tienen datos por completar
              </Label>
              <p id="import-include-incomplete-hint" className="text-sm text-muted-foreground">
                {includeIncomplete
                  ? "Entran con los datos que traen, marcados «Por completar». Los completas después desde Clientes."
                  : "No se importarán: salen abajo, con los errores."}
              </p>
            </div>
          </div>
          {includeIncomplete && <ImportIssues issues={incompleteIssuesOf(incomplete)} />}
        </section>
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
