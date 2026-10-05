import { formatNumericDate } from "@/lib/format";
import { parseClinicalNumber } from "@/lib/validations/clinical";
import type { ClinicalField, ClinicalFieldValue, ClinicalNoteData, ClinicalTemplate } from "@/types";

/** Utilidades de las plantillas de historia clínica (formulario, ficha e impresión). */

type BmiField = Extract<ClinicalField, { type: "bmi" }>;

const numberFormat = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 });

export const formatClinicalNumber = (value: number) => numberFormat.format(value);

/** IMC = peso (kg) / talla (m)², con un decimal; null si falta alguno de los dos. */
export function computeBmi(field: BmiField, data: Record<string, unknown>): number | null {
  const weight = parseClinicalNumber(data[field.weightField]);
  const height = parseClinicalNumber(data[field.heightField]);
  if (!weight || !height || Number.isNaN(weight) || Number.isNaN(height)) return null;
  const meters = height / 100;
  return Math.round((weight / (meters * meters)) * 10) / 10;
}

/** Clasificación de la OMS para adultos. */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Bajo peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidad grado I";
  if (bmi < 40) return "Obesidad grado II";
  return "Obesidad grado III";
}

export const describeBmi = (bmi: number) => `${formatClinicalNumber(bmi)} · ${bmiCategory(bmi)}`;

/** Texto de un valor guardado (no aplica a listas, secciones ni IMC). */
export function describeClinicalValue(field: ClinicalField, value: ClinicalFieldValue): string {
  switch (field.type) {
    case "number":
      return [formatClinicalNumber(value as number), field.unit].filter(Boolean).join(" ");
    case "scale":
      return `${value as number}/${field.max}`;
    case "multiselect":
      return (value as string[]).join(", ");
    case "boolean":
      return value ? "Sí" : "No";
    case "date":
      return formatNumericDate(value as string);
    default:
      return String(value);
  }
}

/**
 * Campos que se muestran de una evolución: los que tienen valor, el IMC si se puede calcular y
 * las secciones con algo debajo.
 */
export function visibleNoteFields(fields: ClinicalField[], data: ClinicalNoteData): ClinicalField[] {
  const hasValue = (field: ClinicalField) =>
    field.type === "bmi" ? computeBmi(field, data) !== null : field.type !== "section" && data[field.id] !== undefined;
  return fields.filter((field, index) => {
    if (field.type !== "section") return hasValue(field);
    const next = fields.findIndex((other, i) => i > index && other.type === "section");
    return fields.slice(index + 1, next === -1 ? undefined : next).some(hasValue);
  });
}

/**
 * Formato de todo el negocio: el que se propone en cada evolución nueva (salvo que el servicio de
 * la cita tenga el suyo). Lo marca la API; si faltara, el general.
 */
export function businessTemplate(templates: ClinicalTemplate[]): ClinicalTemplate | undefined {
  return (
    templates.find((template) => template.isDefault) ??
    templates.find((template) => template.id === "evolucion-general") ??
    templates[0]
  );
}
