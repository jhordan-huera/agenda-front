import { useState } from "react";
import type { ClinicalField } from "@/types";
import { ClinicalFieldInput } from "../clinical-field-input";
import { initialClinicalValues, type ClinicalFormValues } from "../clinical-form-values";

/** Campos que se pueden dibujar aunque el formato aún esté a medio configurar. */
function previewable(field: ClinicalField): boolean {
  if (field.type === "scale") return field.max > field.min && field.max - field.min <= 20;
  if (field.type === "select" || field.type === "multiselect") return field.options.length > 0;
  if (field.type === "list") return field.columns.length > 0;
  return true;
}

/** Vista previa interactiva de un formato: se puede probar, pero no guarda nada. */
export function TemplatePreview({ fields }: { fields: ClinicalField[] }) {
  const [values, setValues] = useState<ClinicalFormValues>({});
  const visible = fields.filter(previewable);
  const merged = { ...initialClinicalValues(visible), ...values };
  if (visible.length === 0) return <p className="text-sm text-muted-foreground">Añade campos para ver cómo queda.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-6">
      {visible.map((field) => (
        <ClinicalFieldInput
          key={field.id}
          field={{ ...field, label: field.label || "(sin nombre)" }}
          values={merged}
          onChange={(id, value) => setValues((current) => ({ ...current, [id]: value }))}
        />
      ))}
    </div>
  );
}
