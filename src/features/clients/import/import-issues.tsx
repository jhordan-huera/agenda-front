import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCount, type ImportIssue } from "./import-data";

/** Cuántas filas se muestran de entrada (las demás, con «Ver todas»). */
const FIRST_ISSUES = 50;

const KIND_STYLES: Record<ImportIssue["kind"], string> = {
  error: "bg-destructive/10 text-destructive",
  existing: "bg-accent text-ink",
  repeated: "bg-muted text-muted-foreground",
  overLimit: "bg-highlight/15 text-ink",
  incomplete: "bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
};

/**
 * Las filas de la revisión y del resultado, una por línea («Fila 12 · La cédula no es válida…»), sin
 * tablas anchas: lo que no se importa o lo que entra por completar.
 */
export function ImportIssues({ issues, linkExisting = false }: { issues: ImportIssue[]; linkExisting?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  if (issues.length === 0) return null;
  const visible = showAll ? issues : issues.slice(0, FIRST_ISSUES);
  return (
    <div className="space-y-3">
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {visible.map((issue) => (
          <li key={`${issue.kind}-${issue.row}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
            <span
              className={cn(
                "inline-flex min-w-[4.5rem] shrink-0 justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                KIND_STYLES[issue.kind],
              )}
            >
              Fila {issue.row}
            </span>
            <span className="min-w-0 flex-1 break-words">{issue.text}</span>
            {linkExisting && issue.clientId && (
              <Button asChild variant="link" size="sm" className="h-auto px-0">
                <Link to={`/dashboard/clients/${issue.clientId}`}>Ver ficha</Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
      {issues.length > FIRST_ISSUES && (
        <Button variant="outline" size="sm" onClick={() => setShowAll((current) => !current)}>
          {showAll ? "Ver menos" : `Ver todas (${formatCount(issues.length)})`}
        </Button>
      )}
    </div>
  );
}
