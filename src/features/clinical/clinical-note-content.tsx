import { computeBmi, describeBmi, describeClinicalValue, visibleNoteFields } from "@/lib/clinical-templates";
import { cn } from "@/lib/utils";
import type { ClinicalField, ClinicalListRow, ClinicalNoteData } from "@/types";

/** Valores cortos (números, escalas, sí/no…): van en una cuadrícula para ocupar menos. */
const COMPACT_TYPES = new Set<ClinicalField["type"]>(["number", "scale", "boolean", "date", "bmi", "select"]);

function ListValue({ field, rows }: { field: Extract<ClinicalField, { type: "list" }>; rows: ClinicalListRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border print:overflow-visible">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {field.columns.map((column) => (
              <th key={column.id} scope="col" className="px-2.5 py-1.5 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index}>
              {field.columns.map((column) => {
                const value = row[column.id];
                return (
                  <td key={column.id} className="px-2.5 py-1.5 align-top">
                    {value === null || value === undefined || value === "" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      String(value)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Value({ field, data }: { field: ClinicalField; data: ClinicalNoteData }) {
  if (field.type === "bmi") {
    const bmi = computeBmi(field, data);
    return <>{bmi === null ? "—" : describeBmi(bmi)}</>;
  }
  if (field.type === "list") return <ListValue field={field} rows={data[field.id] as ClinicalListRow[]} />;
  return <>{describeClinicalValue(field, data[field.id])}</>;
}

/**
 * Contenido de una evolución con los campos de la versión de plantilla con que se escribió
 * (ficha del paciente e impresión). Sólo muestra lo que tiene valor.
 */
export function ClinicalNoteContent({ fields, data, className }: { fields: ClinicalField[]; data: ClinicalNoteData; className?: string }) {
  const visible = visibleNoteFields(fields, data);
  // Agrupa los valores cortos consecutivos en una cuadrícula.
  const blocks: ClinicalField[][] = [];
  for (const field of visible) {
    const last = blocks.at(-1);
    if (COMPACT_TYPES.has(field.type) && last && COMPACT_TYPES.has(last[0].type)) last.push(field);
    else blocks.push([field]);
  }

  return (
    <div className={cn("grid gap-3 text-sm", className)}>
      {blocks.map((block) => {
        const [first] = block;
        if (first.type === "section") {
          return (
            <h4 key={first.id} className="border-b pt-1 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {first.label}
            </h4>
          );
        }
        return (
          <dl key={first.id} className={cn("grid gap-3", COMPACT_TYPES.has(first.type) && "grid-cols-2 sm:grid-cols-3")}>
            {block.map((field) => (
              <div key={field.id}>
                <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
                <dd className={cn("whitespace-pre-line", field.type === "list" && "mt-1")}>
                  <Value field={field} data={data} />
                </dd>
              </div>
            ))}
          </dl>
        );
      })}
    </div>
  );
}
