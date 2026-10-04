import type { ClinicalNote, ClinicalProfile } from "@/types";

export const SEX_OPTIONS: { value: ClinicalProfile["sex"]; label: string }[] = [
  { value: "", label: "Sin especificar" },
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
];

/** Campos de una evolución en el orden en que se muestran. */
export const NOTE_FIELDS: { key: keyof Pick<ClinicalNote, "reason" | "findings" | "diagnosis" | "treatment" | "indications" | "nextControl">; label: string }[] = [
  { key: "reason", label: "Motivo de consulta" },
  { key: "findings", label: "Hallazgos / evaluación" },
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "treatment", label: "Tratamiento / plan" },
  { key: "indications", label: "Indicaciones" },
  { key: "nextControl", label: "Próximo control" },
];

/** Antecedentes en texto largo, en el orden en que se muestran. */
export const HISTORY_FIELDS: { key: keyof Pick<ClinicalProfile, "allergies" | "conditions" | "medications" | "surgeries" | "familyHistory">; label: string; placeholder: string }[] = [
  { key: "allergies", label: "Alergias", placeholder: "Medicamentos, alimentos, látex…" },
  { key: "conditions", label: "Enfermedades previas o crónicas", placeholder: "Diabetes, hipertensión, asma…" },
  { key: "medications", label: "Medicación actual", placeholder: "Nombre y dosis" },
  { key: "surgeries", label: "Cirugías y hospitalizaciones", placeholder: "Año y motivo" },
  { key: "familyHistory", label: "Antecedentes familiares", placeholder: "Enfermedades relevantes en la familia" },
];
