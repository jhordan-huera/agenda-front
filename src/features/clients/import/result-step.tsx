import { CircleCheck, FileSpreadsheet, Users } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import type { ClientImportResult } from "@/types";
import { formatCount, importedText, issuesOf } from "./import-data";
import { ImportIssues } from "./import-issues";

/** «3 ya existían, 5 con errores y 2 repetidas en el archivo»: lo que no entró, sólo con cifras. */
function notImportedText(result: ClientImportResult): string {
  const parts = [
    result.existing.length > 0 && `${formatCount(result.existing.length)} ${result.existing.length === 1 ? "ya existía" : "ya existían"}`,
    result.errors.length > 0 && `${formatCount(result.errors.length)} con ${result.errors.length === 1 ? "error" : "errores"}`,
    result.repeated.length > 0 &&
      `${formatCount(result.repeated.length)} ${result.repeated.length === 1 ? "repetida" : "repetidas"} en el archivo`,
    result.overLimit.length > 0 && `${formatCount(result.overLimit.length)} por el tope de tu plan`,
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return "Todas las filas del archivo entraron.";
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`;
  return `No se importaron: ${list}.`;
}

/**
 * Al terminar: el resumen de la API (si alguien creó un paciente entretanto y la cifra cambió, manda
 * ésta), lo que no entró con «Ver ficha» en los que ya existían y el camino de vuelta a la lista.
 */
export function ResultStep({
  result,
  clientName,
  onAnother,
}: {
  result: ClientImportResult;
  clientName: (clientId: string) => string | undefined;
  onAnother: () => void;
}) {
  const issues = issuesOf(result, clientName);
  return (
    <div className="space-y-6">
      <div role="status" className="flex gap-3 rounded-xl border bg-card p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-ink" aria-hidden>
          <CircleCheck className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-lg font-bold">{importedText(result.created)}</p>
          <p className="text-sm text-muted-foreground">{notImportedText(result)}</p>
        </div>
      </div>

      {issues.length > 0 && (
        <section aria-labelledby="import-result-issues" className="space-y-3">
          <h2 id="import-result-issues" className="font-semibold">
            Lo que no se importó
          </h2>
          <ImportIssues issues={issues} linkExisting />
        </section>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onAnother}>
          <FileSpreadsheet /> Importar otro archivo
        </Button>
        <Button asChild size="lg">
          <Link to="/dashboard/clients">
            <Users /> Ver pacientes
          </Link>
        </Button>
      </div>
    </div>
  );
}
