import { useState } from "react";
import type { FieldErrors } from "@/lib/validations/validate";

/**
 * Estado de un formulario que edita datos ya guardados.
 *
 * `saved` se recalcula en cada render a partir de los datos del servidor
 * (TanStack Query): el formulario está "sucio" mientras sus valores difieran
 * de lo guardado. Tras guardar, llama a `reset(valoresNormalizados)` para que
 * el formulario muestre lo que realmente quedó guardado (trim, minúsculas…).
 */
export function useSettingsForm<T extends object>(saved: T) {
  const [values, setValues] = useState<T>(saved);
  const [errors, setErrors] = useState<FieldErrors>({});
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const setField = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    // El error de un campo desaparece en cuanto el usuario lo corrige.
    setErrors((current) => {
      const name = String(key);
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const reset = (next: T = saved) => {
    setValues(next);
    setErrors({});
  };

  return { values, setField, errors, setErrors, dirty, reset };
}
