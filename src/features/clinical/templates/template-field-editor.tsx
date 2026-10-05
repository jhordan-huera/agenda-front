import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { createElement } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fieldTypeIcon, fieldTypeLabel, newFieldId, type FieldDraft } from "./template-editor-model";

interface TemplateFieldEditorProps {
  draft: FieldDraft;
  index: number;
  total: number;
  /** Campos numéricos del formato (para elegir peso y talla del IMC). */
  numberFields: FieldDraft[];
  error?: string;
  onChange: (patch: Partial<FieldDraft>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

/** Tarjeta de un campo en el editor de formatos: nombre, ayuda, obligatorio y su configuración. */
export function TemplateFieldEditor({ draft, index, total, numberFields, error, onChange, onMove, onRemove }: TemplateFieldEditorProps) {
  const isSection = draft.type === "section";
  const canBeRequired = !["section", "bmi"].includes(draft.type);

  return (
    <li
      className={cn("grid gap-3 rounded-xl border bg-background p-3", isSection && "bg-muted/40", error && "border-destructive ring-3 ring-destructive/20")}
      aria-label={`Campo ${index + 1}: ${draft.label || fieldTypeLabel(draft.type)}`}
      data-field-error={error ? "true" : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
          {createElement(fieldTypeIcon(draft.type), { className: "size-3.5", "aria-hidden": true })}
        </span>
        <span className="flex-1 text-xs font-medium text-muted-foreground">{fieldTypeLabel(draft.type)}</span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Subir campo" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Bajar campo" disabled={index === total - 1} onClick={() => onMove(1)}>
          <ArrowDown />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar campo" onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <FormField label={isSection ? "Título" : "Nombre del campo"}>
          {(field) => (
            <Input
              {...field}
              placeholder={isSection ? "Ej.: Signos vitales" : "Ej.: Motivo de consulta"}
              value={draft.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          )}
        </FormField>
        {canBeRequired && (
          <label className="flex h-8 items-center gap-2 text-sm">
            <Switch checked={draft.required} onCheckedChange={(required) => onChange({ required })} /> Obligatorio
          </label>
        )}
      </div>

      {!isSection && (
        <FormField label="Ayuda" optional>
          {(field) => (
            <Input {...field} placeholder="Texto pequeño bajo el campo" value={draft.hint} onChange={(e) => onChange({ hint: e.target.value })} />
          )}
        </FormField>
      )}

      {(draft.type === "text" || draft.type === "textarea") && (
        <FormField label="Ejemplo dentro del campo" optional>
          {(field) => <Input {...field} value={draft.placeholder} onChange={(e) => onChange({ placeholder: e.target.value })} />}
        </FormField>
      )}

      {draft.type === "number" && (
        <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <FormField label="Unidad" optional>
            {(field) => <Input {...field} placeholder="kg, cm, °C…" value={draft.unit} onChange={(e) => onChange({ unit: e.target.value })} />}
          </FormField>
          <FormField label="Mínimo" optional>
            {(field) => <Input {...field} inputMode="decimal" value={draft.min} onChange={(e) => onChange({ min: e.target.value })} />}
          </FormField>
          <FormField label="Máximo" optional>
            {(field) => <Input {...field} inputMode="decimal" value={draft.max} onChange={(e) => onChange({ max: e.target.value })} />}
          </FormField>
          <label className="flex h-8 items-center gap-2 text-sm">
            <Switch checked={draft.decimals} onCheckedChange={(decimals) => onChange({ decimals })} /> Decimales
          </label>
        </div>
      )}

      {draft.type === "scale" && (
        <div className="grid gap-3 sm:grid-cols-4">
          <FormField label="Desde">
            {(field) => <Input {...field} inputMode="numeric" value={draft.min} onChange={(e) => onChange({ min: e.target.value })} />}
          </FormField>
          <FormField label="Hasta">
            {(field) => <Input {...field} inputMode="numeric" value={draft.max} onChange={(e) => onChange({ max: e.target.value })} />}
          </FormField>
          <FormField label="Texto del mínimo" optional>
            {(field) => <Input {...field} placeholder="Sin dolor" value={draft.minLabel} onChange={(e) => onChange({ minLabel: e.target.value })} />}
          </FormField>
          <FormField label="Texto del máximo" optional>
            {(field) => <Input {...field} placeholder="Máximo" value={draft.maxLabel} onChange={(e) => onChange({ maxLabel: e.target.value })} />}
          </FormField>
        </div>
      )}

      {(draft.type === "select" || draft.type === "multiselect") && (
        <FormField label="Opciones" hint="Una por línea.">
          {(field) => (
            <Textarea {...field} rows={4} placeholder={"Leve\nModerado\nGrave"} value={draft.options} onChange={(e) => onChange({ options: e.target.value })} />
          )}
        </FormField>
      )}

      {draft.type === "list" && (
        <div className="grid gap-2">
          <p className="text-sm font-medium">Columnas</p>
          {draft.columns.map((column, columnIndex) => (
            <div key={column.id} className="flex items-center gap-2">
              <Input
                aria-label={`Nombre de la columna ${columnIndex + 1}`}
                placeholder="Ej.: Principio activo"
                value={column.label}
                onChange={(e) => onChange({ columns: draft.columns.map((c, i) => (i === columnIndex ? { ...c, label: e.target.value } : c)) })}
              />
              <Select
                value={column.type}
                onValueChange={(type) =>
                  onChange({ columns: draft.columns.map((c, i) => (i === columnIndex ? { ...c, type: type as "text" | "number" } : c)) })
                }
              >
                <SelectTrigger aria-label={`Tipo de la columna ${columnIndex + 1}`} className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar la columna ${columnIndex + 1}`}
                disabled={draft.columns.length === 1}
                onClick={() => onChange({ columns: draft.columns.filter((_, i) => i !== columnIndex) })}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-self-start"
            disabled={draft.columns.length >= 8}
            onClick={() => onChange({ columns: [...draft.columns, { id: newFieldId("c"), label: "", type: "text" }] })}
          >
            <Plus /> Añadir columna
          </Button>
          <FormField label="Texto del botón para añadir filas" optional>
            {(field) => <Input {...field} placeholder="Agregar medicamento" value={draft.addLabel} onChange={(e) => onChange({ addLabel: e.target.value })} />}
          </FormField>
        </div>
      )}

      {draft.type === "bmi" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["weightField", "heightField"] as const).map((key) => (
            <FormField key={key} label={key === "weightField" ? "Campo del peso (kg)" : "Campo de la talla (cm)"}>
              {(field) => (
                <Select value={draft[key] || undefined} onValueChange={(id) => onChange({ [key]: id })}>
                  <SelectTrigger {...field} className="w-full">
                    <SelectValue placeholder={numberFields.length ? "Elige un campo numérico" : "Añade antes un campo Número"} />
                  </SelectTrigger>
                  <SelectContent>
                    {numberFields.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label || "(sin nombre)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          ))}
        </div>
      )}

      {draft.type === "questionnaire" && draft.questionnaire && (
        <p className="text-xs text-muted-foreground">
          {draft.questionnaire.items.length} preguntas · puntaje de 0 a{" "}
          {draft.questionnaire.items.length * Math.max(...draft.questionnaire.options.map((o) => o.points))}. Las preguntas no se
          editan: es un instrumento validado.
        </p>
      )}

      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
