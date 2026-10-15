import { Download, FileSpreadsheet, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useId, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientRequiredFields } from "@/types";
import { requiredFieldsText } from "./import-data";

/** Una fila rellena de ejemplo, al lado de la plantilla (la plantilla no lleva filas: se importarían). */
const EXAMPLE = [
  { label: "Nombre", value: "María Fernanda López" },
  { label: "Cédula", value: "0912345675" },
  { label: "Email", value: "mafer@ejemplo.com" },
  { label: "Teléfono", value: "099 123 4567" },
  { label: "Dirección", value: "Av. 9 de Octubre 123" },
  { label: "Notas", value: "Prefiere las tardes" },
];

/**
 * Paso 1: elegir el archivo (o arrastrarlo, en el escritorio) o descargar la plantilla. El archivo se
 * lee en el navegador: no se sube ni se guarda.
 */
export function FileStep({
  required,
  reading,
  error,
  onFile,
}: {
  required: ClientRequiredFields;
  reading: boolean;
  error: string | null;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !reading) onFile(file);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed bg-card px-5 py-10 text-center transition-colors",
            dragging && "border-primary bg-primary/5",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-ink" aria-hidden>
            {reading ? <Loader2 className="size-5 animate-spin" /> : <FileSpreadsheet className="size-5" />}
          </span>
          <div className="space-y-1">
            <p className="font-semibold">{reading ? "Leyendo el archivo…" : "Elige tu lista de pacientes"}</p>
            <p className="text-sm text-muted-foreground">
              Excel (.xlsx) o CSV, de hasta 5.000 filas. <span className="hidden md:inline">También puedes arrastrarlo aquí.</span>
            </p>
          </div>
          {/* El campo de archivo de verdad, accesible con el teclado; la etiqueta hace de botón. */}
          <input
            id={inputId}
            type="file"
            accept=".xlsx,.csv"
            className="peer sr-only"
            disabled={reading}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onFile(file);
            }}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_18%)] peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
              reading && "pointer-events-none opacity-50",
            )}
          >
            <Upload className="size-4" aria-hidden /> Elegir archivo
          </label>
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="flex gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          El archivo se lee en tu equipo: no se sube ni se guarda. Al importar sólo se envían los datos de cada paciente, y
          ninguno recibe emails.
        </p>
      </div>

      <aside className="space-y-4 rounded-xl border bg-card p-5" aria-labelledby={`${inputId}-template`}>
        <div className="space-y-1">
          <h2 id={`${inputId}-template`} className="font-semibold">
            ¿No tienes la lista en un archivo?
          </h2>
          <p className="text-sm text-muted-foreground">Descarga la plantilla, llénala en Excel y vuelve aquí.</p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <a href="/plantilla-pacientes.xlsx" download="plantilla-pacientes.xlsx">
            <Download /> Descargar plantilla
          </a>
        </Button>
        <p className="text-sm">
          {requiredFieldsText(required)}
          {Object.values(required).some(Boolean) && " Si a alguno le falta un dato, lo puedes importar igual, «Por completar»."}
        </p>
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ejemplo de una fila</p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
            {EXAMPLE.map((item) => (
              <div key={item.label} className="contents">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="truncate">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
