import { AlertTriangle, CircleCheck, Download, FileArchive, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useBusinessId, useSession } from "@/features/auth/use-session";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { getErrorMessage } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { buildDataExport, saveFile, type ExportProgress, type ExportResult } from "./download-data";

type Place = "business" | "profile";

type ExportState =
  | { status: "idle" }
  | { status: "running"; progress: ExportProgress }
  | { status: "done"; result: ExportResult }
  | { status: "error"; message: string };

/**
 * «Descargar los datos del negocio» (spec 028): un ZIP con los pacientes y las citas en Excel, las
 * historias clínicas (una página por paciente) y sus archivos. El propietario la ve en Configuración →
 * Negocio (todo el negocio) y el rol Profesional en su Perfil («Descargar mis datos»: lo de su agenda).
 * Nadie más: ni el administrador, ni la recepción, ni el super admin en modo soporte (la API también lo
 * rechaza).
 */
export function DataExportCard({ place }: { place: Place }) {
  const { session } = useSession();
  const allowed = !session?.support && (place === "business" ? session?.role === "owner" : session?.role === "professional");
  return allowed ? <DataExportPanel place={place} clinicalAccess={Boolean(session?.clinicalAccess)} /> : null;
}

/**
 * El avance de 0 a 100, a ojo: cada archivo adjunto tarda mucho más que un paciente o una cita (se pide
 * su enlace y se baja entero), y cada historia, más que una fila de Excel.
 */
const WEIGHTS = { clients: 1, appointments: 1, clinicalRecords: 10, attachments: 200 } as const;

function percentOf({ step, total, done }: ExportProgress): number {
  if (!total) return 0;
  if (step === "zip") return 100;
  const keys = Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[];
  const all = keys.reduce((sum, key) => sum + total[key] * WEIGHTS[key], 0);
  const finished = keys.reduce((sum, key) => sum + Math.min(done[key], total[key]) * WEIGHTS[key], 0);
  return all === 0 ? 100 : Math.round((finished / all) * 100);
}

/** «Preparando… 120 de 340 pacientes», «Preparando… 12 de 85 historias clínicas · 3 de 40 archivos»… */
function progressText({ step, total, done }: ExportProgress): string {
  const of = (key: keyof ExportProgress["done"], what: string) => `${formatCount(done[key])} de ${formatCount(total?.[key] ?? 0)} ${what}`;
  switch (step) {
    case "summary":
      return "Preparando…";
    case "clients":
      return `Preparando… ${of("clients", "pacientes")}`;
    case "appointments":
      return `Preparando… ${of("appointments", "citas")}`;
    case "clinical":
      return `Preparando… ${of("clinicalRecords", "historias clínicas")}${total?.attachments ? ` · ${of("attachments", "archivos")}` : ""}`;
    case "zip":
      return "Armando el archivo ZIP…";
  }
}

function DataExportPanel({ place, clinicalAccess }: { place: Place; clinicalAccess: boolean }) {
  const businessId = useBusinessId();
  const { data: business } = useCurrentBusiness();
  const [state, setState] = useState<ExportState>({ status: "idle" });
  const running = state.status === "running";
  const own = place === "profile";
  const clinicalEnabled = Boolean(business?.clinicalRecordsEnabled);
  const clinical = clinicalEnabled && (place === "business" || clinicalAccess);

  // Cerrar o recargar la página a mitad la corta (en el servidor no queda nada): se avisa antes.
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const start = async () => {
    setState({ status: "running", progress: { step: "summary", total: null, done: { clients: 0, appointments: 0, clinicalRecords: 0, attachments: 0 } } });
    try {
      const result = await buildDataExport(businessId, (progress) => setState({ status: "running", progress }));
      saveFile(result.file, result.fileName);
      setState({ status: "done", result });
    } catch (error) {
      setState({ status: "error", message: getErrorMessage(error) });
    }
  };

  const contents = [
    own ? "Tus pacientes, en Excel, con las columnas de la importación de pacientes." : "pacientes.xlsx: tus pacientes, con las columnas de la importación para volver a subirlos.",
    own ? "Las citas de tu agenda, en Excel." : "citas.xlsx: todas las citas, con sus pacientes, el servicio, el estado y el pago.",
    // Lo clínico depende del negocio: mientras carga, no se dice nada.
    !business
      ? null
      : clinical
        ? `Las historias clínicas${own ? " de tus pacientes" : ""}: una página por paciente que se abre en el navegador y se guarda como PDF, con sus archivos originales.`
        : !clinicalEnabled
          ? `Sin historias clínicas: no están activadas en ${own ? "el" : "tu"} negocio.`
          : "Sin historias clínicas: no tienes acceso a ellas. Si las necesitas, pídele al propietario que te lo habilite.",
  ].filter((line): line is string => line !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <CardTitleIcon icon={FileArchive} /> {own ? "Descargar mis datos" : "Descargar los datos del negocio"}
        </CardTitle>
        <CardDescription>
          Un archivo ZIP para guardar una copia o llevarte tus datos cuando quieras{own ? ": sólo lo de tu agenda." : "."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="grid list-disc gap-1 pl-5 text-sm">
          {contents.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Contiene datos personales{clinical ? " y de salud" : ""} de tus pacientes: guárdalo en un lugar seguro. Cada descarga queda en la
          actividad.
        </p>

        {state.status === "running" && (
          <div className="grid gap-2 rounded-lg border p-3" role="status" aria-live="polite">
            <p className="text-sm font-medium">{progressText(state.progress)}</p>
            <Progress value={percentOf(state.progress)} aria-label="Avance de la descarga" />
            <p className="text-xs text-muted-foreground">No cierres esta página hasta que termine.</p>
          </div>
        )}
        {state.status === "done" && (
          <div className="grid gap-1 rounded-lg border p-3 text-sm" role="status">
            <p className="flex items-start gap-2 font-medium">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> Listo: se descargó {state.result.fileName}
            </p>
            {state.result.missingFiles > 0 && (
              <p className="text-muted-foreground">
                {state.result.missingFiles === 1
                  ? "1 archivo no se pudo incluir"
                  : `${formatCount(state.result.missingFiles)} archivos no se pudieron incluir`}
                : el LEEME del ZIP dice cuáles.
              </p>
            )}
            <p className="text-xs text-muted-foreground">Si no lo ves, búscalo en Descargas (en el celular, en Archivos).</p>
          </div>
        )}
        {state.status === "error" && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <p>
              <span className="font-medium">No se pudo terminar la descarga.</span> {state.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {state.status === "done" && (
            <Button type="button" variant="outline" onClick={() => saveFile(state.result.file, state.result.fileName)}>
              <Download /> Guardar otra vez
            </Button>
          )}
          <Button type="button" onClick={start} disabled={running} variant={state.status === "done" ? "ghost" : "default"}>
            {state.status === "error" ? <RotateCw /> : <Download />}
            {running ? "Descargando…" : state.status === "error" ? "Reintentar" : state.status === "done" ? "Descargar de nuevo" : "Descargar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
