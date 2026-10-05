import { Calculator, Plus, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { computeBmi, describeBmi } from "@/lib/clinical-templates";
import { cn } from "@/lib/utils";
import type { BodyMapMark, ClinicalField, OdontogramValue } from "@/types";
import { BodyMapInput } from "./body-map";
import { clinicalFieldSpan, emptyListRow, type ClinicalFormValues, type ListRowDraft } from "./clinical-form-values";
import { OdontogramInput } from "./odontogram";
import { QuestionnaireInput } from "./questionnaire";

/** Botón-opción (chip): para elegir rápido entre pocas opciones. */
function Chip({ selected, onClick, children, role }: { selected: boolean; onClick: () => void; children: string; role: "radio" | "checkbox" }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

interface ClinicalFieldInputProps {
  field: ClinicalField;
  values: ClinicalFormValues;
  onChange: (id: string, value: unknown) => void;
  error?: string;
}

/** Campo de una plantilla en el formulario de evolución, según su tipo. */
export function ClinicalFieldInput({ field, values, onChange, error }: ClinicalFieldInputProps) {
  if (field.type === "section") {
    return (
      <h3 className="col-span-full mt-2 border-b-2 border-ink pb-1.5 text-sm font-bold text-ink">
        {field.label}
      </h3>
    );
  }

  const label = field.required ? `${field.label} *` : field.label;
  const value = values[field.id];
  const set = (next: unknown) => onChange(field.id, next);

  if (field.type === "bmi") {
    const bmi = computeBmi(field, values);
    return (
      <div className={cn("grid content-start gap-2", clinicalFieldSpan(field))}>
        <p className="text-sm font-medium">{field.label}</p>
        <p className="flex h-8 items-center gap-2 rounded-lg border bg-muted/40 px-2.5 text-sm" role="status">
          <Calculator className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {bmi === null ? <span className="text-muted-foreground">Con peso y talla</span> : describeBmi(bmi)}
        </p>
      </div>
    );
  }

  return (
    <FormField label={label} error={error} hint={field.hint} className={clinicalFieldSpan(field)}>
      {(control) => {
        switch (field.type) {
          case "text":
            return <Input {...control} placeholder={field.placeholder} value={String(value ?? "")} onChange={(e) => set(e.target.value)} />;
          case "textarea":
            return (
              <Textarea {...control} rows={3} placeholder={field.placeholder} value={String(value ?? "")} onChange={(e) => set(e.target.value)} />
            );
          case "date":
            return <Input {...control} type="date" value={String(value ?? "")} onChange={(e) => set(e.target.value)} />;
          case "questionnaire":
            return (
              <div id={control.id} aria-describedby={control["aria-describedby"]}>
                <QuestionnaireInput field={field} value={Array.isArray(value) ? (value as (number | null)[]) : []} onChange={set} />
              </div>
            );
          case "odontogram":
            return (
              <div id={control.id} aria-describedby={control["aria-describedby"]}>
                <OdontogramInput value={(value as OdontogramValue | undefined) ?? {}} onChange={set} />
              </div>
            );
          case "bodymap":
            return (
              <div id={control.id} aria-describedby={control["aria-describedby"]}>
                <BodyMapInput value={Array.isArray(value) ? (value as BodyMapMark[]) : []} onChange={set} />
              </div>
            );
          case "number":
            return (
              <div className="flex items-center rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <Input
                  {...control}
                  inputMode="decimal"
                  className="border-0 focus-visible:ring-0"
                  value={String(value ?? "")}
                  // Sólo números, una coma o punto decimal y el signo.
                  onChange={(e) => set(e.target.value.replace(/[^\d.,-]/g, ""))}
                />
                {field.unit && <span className="pr-2.5 text-sm text-muted-foreground">{field.unit}</span>}
              </div>
            );
          case "scale": {
            const points = Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i);
            return (
              <div id={control.id} role="radiogroup" aria-label={field.label} aria-describedby={control["aria-describedby"]} className="grid gap-1">
                <div className="flex flex-wrap gap-1">
                  {points.map((point) => (
                    <button
                      key={point}
                      type="button"
                      role="radio"
                      aria-checked={value === point}
                      onClick={() => set(value === point ? null : point)}
                      className={cn(
                        "size-8 rounded-md border text-sm tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        value === point ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                      )}
                    >
                      {point}
                    </button>
                  ))}
                </div>
                {(field.minLabel || field.maxLabel) && (
                  <p className="flex justify-between text-xs text-muted-foreground" style={{ maxWidth: `${points.length * 2.25}rem` }}>
                    <span>{field.minLabel}</span>
                    <span>{field.maxLabel}</span>
                  </p>
                )}
              </div>
            );
          }
          case "boolean":
            return (
              <div id={control.id} role="radiogroup" aria-label={field.label} className="flex gap-1.5">
                {[true, false].map((option) => (
                  <Chip key={String(option)} role="radio" selected={value === option} onClick={() => set(value === option ? null : option)}>
                    {option ? "Sí" : "No"}
                  </Chip>
                ))}
              </div>
            );
          case "select":
            // Pocas opciones: chips (un toque). Muchas: lista desplegable.
            return field.options.length <= 6 ? (
              <div id={control.id} role="radiogroup" aria-label={field.label} aria-describedby={control["aria-describedby"]} className="flex flex-wrap gap-1.5">
                {field.options.map((option) => (
                  <Chip key={option} role="radio" selected={value === option} onClick={() => set(value === option ? "" : option)}>
                    {option}
                  </Chip>
                ))}
              </div>
            ) : (
              <Select value={String(value ?? "")} onValueChange={set}>
                <SelectTrigger {...control} className="w-full">
                  <SelectValue placeholder="Elige una opción" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          case "multiselect": {
            const chosen = Array.isArray(value) ? (value as string[]) : [];
            return (
              <div id={control.id} role="group" aria-label={field.label} aria-describedby={control["aria-describedby"]} className="flex flex-wrap gap-1.5">
                {field.options.map((option) => (
                  <Chip
                    key={option}
                    role="checkbox"
                    selected={chosen.includes(option)}
                    onClick={() => set(chosen.includes(option) ? chosen.filter((o) => o !== option) : [...chosen, option])}
                  >
                    {option}
                  </Chip>
                ))}
              </div>
            );
          }
          case "list": {
            const rows = Array.isArray(value) ? (value as ListRowDraft[]) : [];
            const setCell = (index: number, column: string, cell: string) =>
              set(rows.map((row, i) => (i === index ? { ...row, [column]: cell } : row)));
            // Columnas: las numéricas (cantidad, series) más estrechas que las de texto.
            const columnsStyle = {
              "--columns": field.columns.map((column) => (column.type === "number" ? "minmax(4.5rem,0.5fr)" : "minmax(0,1fr)")).join(" "),
            } as CSSProperties;
            return (
              <div id={control.id} role="group" aria-label={field.label} aria-describedby={control["aria-describedby"]} className="grid gap-2">
                {/* Encabezados de columna (en el celular cada casilla lleva el suyo). */}
                <div aria-hidden className="hidden gap-2 pr-[2.9rem] pl-[0.6rem] text-xs font-medium text-muted-foreground sm:grid sm:[grid-template-columns:var(--columns)]" style={columnsStyle}>
                  {field.columns.map((column) => (
                    <span key={column.id}>{column.label}</span>
                  ))}
                </div>
                {rows.map((row, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-lg border bg-muted/20 p-2">
                    <div className="grid flex-1 gap-2 sm:[grid-template-columns:var(--columns)]" style={columnsStyle}>
                      {field.columns.map((column) => (
                        <label key={column.id} className="grid gap-1">
                          <span className="text-xs text-muted-foreground sm:sr-only">{column.label}</span>
                          <Input
                            aria-label={`${column.label} (fila ${index + 1})`}
                            placeholder={column.placeholder}
                            inputMode={column.type === "number" ? "decimal" : undefined}
                            value={row[column.id] ?? ""}
                            onChange={(e) =>
                              setCell(index, column.id, column.type === "number" ? e.target.value.replace(/[^\d.,-]/g, "") : e.target.value)
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Quitar fila ${index + 1}`}
                      onClick={() => set(rows.length === 1 ? [emptyListRow(field)] : rows.filter((_, i) => i !== index))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set([...rows, emptyListRow(field)])}>
                  <Plus /> {field.addLabel ?? "Agregar fila"}
                </Button>
              </div>
            );
          }
        }
      }}
    </FormField>
  );
}
