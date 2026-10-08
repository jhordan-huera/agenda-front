import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { useUploadImage } from "@/hooks/queries/use-images";
import { getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { ImageTarget } from "@/types";

/** Lo que se acepta elegir: el navegador la reduce antes de subirla (queda en pocos KB). */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

interface ImageUploadFieldProps {
  label: string;
  /** Para qué es (foto del perfil, logo del negocio o foto de un profesional). */
  target: ImageTarget;
  /** Dirección de la imagen guardada; `null` si no hay. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Contenido de la vista previa cuando no hay imagen (iniciales, icono…). */
  fallback: ReactNode;
  shape?: "circle" | "square";
  error?: string;
}

/**
 * Selector de imagen con vista previa. La imagen se sube al almacenamiento (Supabase Storage) al
 * elegirla y el formulario guarda su dirección; la anterior se borra al guardar el cambio.
 */
export function ImageUploadField({ label, target, value, onChange, fallback, shape = "circle", error }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string>();
  const upload = useUploadImage(target);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de un error.
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError("El archivo debe ser una imagen (JPG, PNG o WebP).");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setLocalError("La imagen pesa más de 20 MB. Prueba con otra.");
      return;
    }
    try {
      onChange(await upload.mutateAsync(file));
      setLocalError(undefined);
    } catch (uploadError) {
      setLocalError(getErrorMessage(uploadError));
    }
  };

  const remove = () => {
    setLocalError(undefined);
    onChange(null);
  };

  return (
    <FormField label={label} error={localError ?? error} hint="JPG, PNG o WebP. La reducimos automáticamente.">
      {(field) => (
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "relative flex size-16 shrink-0 items-center justify-center overflow-hidden border bg-muted text-lg font-medium text-muted-foreground",
              shape === "circle" ? "rounded-full" : "rounded-xl",
            )}
          >
            {value ? <img src={value} alt={`Vista previa: ${label}`} className="size-full object-cover" /> : fallback}
            {upload.isPending && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="size-5 animate-spin" aria-hidden />
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input {...field} ref={inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={handleFile} />
            <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
              <ImageUp aria-hidden /> {upload.isPending ? "Subiendo…" : value ? "Cambiar imagen" : "Subir imagen"}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" disabled={upload.isPending} onClick={remove}>
                <Trash2 aria-hidden /> Quitar
              </Button>
            )}
          </div>
        </div>
      )}
    </FormField>
  );
}
