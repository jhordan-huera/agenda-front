import type { z } from "zod";

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { success: true; data: T; errors: FieldErrors }
  | { success: false; data: null; errors: FieldErrors };

/** Valida con un esquema Zod y devuelve el primer error de cada campo (para formularios). */
export function validate<T extends z.ZodType>(
  schema: T,
  values: unknown,
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(values);
  if (result.success) return { success: true, data: result.data, errors: {} };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] ??= issue.message;
  }
  return { success: false, data: null, errors };
}
