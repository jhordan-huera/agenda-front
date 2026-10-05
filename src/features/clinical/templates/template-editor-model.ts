import {
  Calculator,
  Calendar,
  CircleDot,
  ClipboardList,
  Hash,
  Heading,
  ListChecks,
  PersonStanding,
  SlidersHorizontal,
  Smile,
  Table2,
  ToggleLeft,
  Type,
  AlignLeft,
  type LucideIcon,
} from "lucide-react";
import type { ClinicalField, ClinicalFieldType } from "@/types";

/**
 * Modelo del editor de formatos: cada campo se edita como "borrador" (todo en texto, como en los
 * inputs) y al guardar se convierte en la definición que valida la API.
 */

export const FIELD_TYPES: { type: Exclude<ClinicalFieldType, "questionnaire">; label: string; icon: LucideIcon }[] = [
  { type: "section", label: "Título de sección", icon: Heading },
  { type: "text", label: "Texto corto", icon: Type },
  { type: "textarea", label: "Texto largo", icon: AlignLeft },
  { type: "number", label: "Número", icon: Hash },
  { type: "scale", label: "Escala (p. ej. dolor 0–10)", icon: SlidersHorizontal },
  { type: "select", label: "Una opción", icon: CircleDot },
  { type: "multiselect", label: "Varias opciones", icon: ListChecks },
  { type: "boolean", label: "Sí / No", icon: ToggleLeft },
  { type: "date", label: "Fecha", icon: Calendar },
  { type: "list", label: "Lista con columnas (receta, diagnósticos…)", icon: Table2 },
  { type: "bmi", label: "IMC automático", icon: Calculator },
  { type: "odontogram", label: "Odontograma", icon: Smile },
  { type: "bodymap", label: "Mapa del cuerpo", icon: PersonStanding },
];

export const fieldTypeLabel = (type: ClinicalFieldType) =>
  type === "questionnaire" ? "Cuestionario con puntaje" : (FIELD_TYPES.find((option) => option.type === type)?.label ?? type);
export const fieldTypeIcon = (type: ClinicalFieldType): LucideIcon =>
  type === "questionnaire" ? ClipboardList : (FIELD_TYPES.find((option) => option.type === type)?.icon ?? Type);

export interface ColumnDraft {
  id: string;
  label: string;
  type: "text" | "number";
}

/** Campo en edición. `existing`: ya estaba guardado (su tipo no cambia). */
export interface FieldDraft {
  key: string;
  id: string;
  type: ClinicalFieldType;
  existing: boolean;
  label: string;
  hint: string;
  required: boolean;
  placeholder: string;
  unit: string;
  min: string;
  max: string;
  decimals: boolean;
  minLabel: string;
  maxLabel: string;
  /** Una opción por línea. */
  options: string;
  columns: ColumnDraft[];
  addLabel: string;
  weightField: string;
  heightField: string;
  /** Cuestionarios: se copian tal cual (no se editan sus preguntas). */
  questionnaire?: Extract<ClinicalField, { type: "questionnaire" }>;
}

/** Id de campo nuevo: estable aunque cambie la etiqueta (las evoluciones guardan por id). */
export const newFieldId = (prefix = "f") => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const baseDraft = (type: ClinicalFieldType): FieldDraft => ({
  key: crypto.randomUUID(),
  id: newFieldId(),
  type,
  existing: false,
  label: "",
  hint: "",
  required: false,
  placeholder: "",
  unit: "",
  min: type === "scale" ? "0" : "",
  max: type === "scale" ? "10" : "",
  decimals: false,
  minLabel: "",
  maxLabel: "",
  options: "",
  columns: type === "list" ? [{ id: newFieldId("c"), label: "", type: "text" }] : [],
  addLabel: "",
  weightField: "",
  heightField: "",
});

export const newFieldDraft = (type: ClinicalFieldType): FieldDraft => ({
  ...baseDraft(type),
  label: { odontogram: "Odontograma", bodymap: "Mapa del cuerpo", bmi: "IMC" }[type as string] ?? "",
});

export function questionnaireDraft(field: Extract<ClinicalField, { type: "questionnaire" }>, existing = false): FieldDraft {
  return { ...baseDraft("questionnaire"), id: field.id, existing, label: field.label, hint: field.hint ?? "", required: Boolean(field.required), questionnaire: field };
}

/** Campo guardado → borrador. */
export function toDraft(field: ClinicalField, existing: boolean): FieldDraft {
  if (field.type === "questionnaire") return questionnaireDraft(field, existing);
  const draft: FieldDraft = { ...baseDraft(field.type), id: field.id, existing, label: field.label, hint: field.hint ?? "", required: Boolean(field.required) };
  switch (field.type) {
    case "text":
    case "textarea":
      return { ...draft, placeholder: field.placeholder ?? "" };
    case "number":
      return {
        ...draft,
        unit: field.unit ?? "",
        min: field.min === undefined ? "" : String(field.min),
        max: field.max === undefined ? "" : String(field.max),
        decimals: field.step !== undefined && field.step < 1,
      };
    case "scale":
      return { ...draft, min: String(field.min), max: String(field.max), minLabel: field.minLabel ?? "", maxLabel: field.maxLabel ?? "" };
    case "select":
    case "multiselect":
      return { ...draft, options: field.options.join("\n") };
    case "list":
      return { ...draft, columns: field.columns.map((column) => ({ id: column.id, label: column.label, type: column.type })), addLabel: field.addLabel ?? "" };
    case "bmi":
      return { ...draft, weightField: field.weightField, heightField: field.heightField };
    default:
      return draft;
  }
}

const optional = (value: string) => (value.trim() ? value.trim() : undefined);
const optionalNumber = (value: string) => (value.trim() === "" ? undefined : Number(value.replace(",", ".")));

/** Borrador → definición (sin propiedades vacías). La valida `clinicalTemplateFieldsSchema`. */
export function fromDraft(draft: FieldDraft): ClinicalField {
  if (draft.type === "questionnaire" && draft.questionnaire) {
    return { ...draft.questionnaire, label: draft.label.trim(), hint: optional(draft.hint), required: draft.required || undefined };
  }
  const base = {
    id: draft.id,
    label: draft.label.trim(),
    ...(optional(draft.hint) && draft.type !== "section" ? { hint: optional(draft.hint) } : {}),
    ...(draft.required && !["section", "bmi"].includes(draft.type) ? { required: true } : {}),
  };
  switch (draft.type) {
    case "text":
    case "textarea":
      return { ...base, type: draft.type, ...(optional(draft.placeholder) ? { placeholder: optional(draft.placeholder) } : {}) };
    case "number":
      return {
        ...base,
        type: "number",
        ...(optional(draft.unit) ? { unit: optional(draft.unit) } : {}),
        ...(optionalNumber(draft.min) !== undefined ? { min: optionalNumber(draft.min) } : {}),
        ...(optionalNumber(draft.max) !== undefined ? { max: optionalNumber(draft.max) } : {}),
        ...(draft.decimals ? { step: 0.1 } : {}),
      };
    case "scale":
      return {
        ...base,
        type: "scale",
        min: Number(draft.min || 0),
        max: Number(draft.max || 10),
        ...(optional(draft.minLabel) ? { minLabel: optional(draft.minLabel) } : {}),
        ...(optional(draft.maxLabel) ? { maxLabel: optional(draft.maxLabel) } : {}),
      };
    case "select":
    case "multiselect":
      return {
        ...base,
        type: draft.type,
        options: draft.options
          .split("\n")
          .map((option) => option.trim())
          .filter(Boolean),
      };
    case "list":
      return {
        ...base,
        type: "list",
        columns: draft.columns.map((column) => ({ id: column.id, label: column.label.trim(), type: column.type })),
        ...(optional(draft.addLabel) ? { addLabel: optional(draft.addLabel) } : {}),
      };
    case "bmi":
      return { ...base, type: "bmi", weightField: draft.weightField, heightField: draft.heightField };
    default:
      return { ...base, type: draft.type } as ClinicalField;
  }
}
