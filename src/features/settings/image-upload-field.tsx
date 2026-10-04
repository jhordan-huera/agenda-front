import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Las imágenes se guardan como data URL en la base de datos: se limita su tamaño. */
const MAX_IMAGE_BYTES = 500 * 1024;

interface ImageUploadFieldProps {
  label: string;
  /** Data URL o URL pública de la imagen; `null` si no hay. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Contenido de la vista previa cuando no hay imagen (iniciales, icono…). */
  fallback: ReactNode;
  shape?: "circle" | "square";
  error?: string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatKilobytes(bytes: number): string {
  return `${Math.ceil(bytes / 1024)} KB`;
}

/**
 * Selector de imagen con vista previa.
 *
 * La imagen se convierte a data URL y se guarda tal cual en `avatarUrl` / `logoUrl`.
 * Cuando haya almacenamiento de archivos (p. ej. Supabase Storage) se subirá allí y aquí se
 * guardará la URL pública del archivo.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  fallback,
  shape = "circle",
  error,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string>();
  const [reading, setReading] = useState(false);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de un error.
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLocalError("El archivo debe ser una imagen (JPG, PNG o WebP).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError(
        `La imagen pesa ${formatKilobytes(file.size)}. El máximo permitido es ${formatKilobytes(MAX_IMAGE_BYTES)}.`,
      );
      return;
    }

    setReading(true);
    try {
      onChange(await readAsDataUrl(file));
      setLocalError(undefined);
    } catch {
      setLocalError("No pudimos leer la imagen. Prueba con otro archivo.");
    } finally {
      setReading(false);
    }
  };

  const remove = () => {
    setLocalError(undefined);
    onChange(null);
  };

  return (
    <FormField label={label} error={localError ?? error} hint="JPG, PNG o WebP. Máximo 500 KB.">
      {(field) => (
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex size-16 shrink-0 items-center justify-center overflow-hidden border bg-muted text-lg font-medium text-muted-foreground",
              shape === "circle" ? "rounded-full" : "rounded-xl",
            )}
          >
            {value ? <img src={value} alt={`Vista previa: ${label}`} className="size-full object-cover" /> : fallback}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              {...field}
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={handleFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reading}
              onClick={() => inputRef.current?.click()}
            >
              <ImageUp aria-hidden /> {value ? "Cambiar imagen" : "Subir imagen"}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" disabled={reading} onClick={remove}>
                <Trash2 aria-hidden /> Quitar
              </Button>
            )}
          </div>
        </div>
      )}
    </FormField>
  );
}
