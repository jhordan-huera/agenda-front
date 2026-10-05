import type { ClinicalField } from "@/types";

/** Valores del formulario tal como se escriben (los números como texto); los normaliza el esquema. */
export type ClinicalFormValues = Record<string, unknown>;
export type ListRowDraft = Record<string, string>;

export const emptyListRow = (field: Extract<ClinicalField, { type: "list" }>): ListRowDraft =>
  Object.fromEntries(field.columns.map((column) => [column.id, ""]));

/** Valores iniciales: todo vacío; las listas con una fila para que se vean sus columnas. */
export function initialClinicalValues(fields: ClinicalField[]): ClinicalFormValues {
  return Object.fromEntries(
    fields.flatMap((field): [string, unknown][] => {
      switch (field.type) {
        case "section":
        case "bmi":
          return [];
        case "multiselect":
        case "bodymap":
          return [[field.id, []]];
        case "odontogram":
          return [[field.id, {}]];
        case "questionnaire":
          return [[field.id, field.items.map(() => null)]];
        case "list":
          return [[field.id, [emptyListRow(field)]]];
        case "boolean":
        case "scale":
          return [[field.id, null]];
        default:
          return [[field.id, ""]];
      }
    }),
  );
}

/** Ancho en la cuadrícula de 6 columnas del formulario. */
export function clinicalFieldSpan(field: ClinicalField): string {
  switch (field.type) {
    case "number":
    case "date":
    case "bmi":
      return "sm:col-span-2";
    case "boolean":
      return "sm:col-span-3";
    default:
      return "sm:col-span-6";
  }
}
