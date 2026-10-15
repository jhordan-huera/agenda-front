import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/use-permissions";
import { ColumnsStep } from "@/features/clients/import/columns-step";
import { FileStep } from "@/features/clients/import/file-step";
import { defaultSheetIndex, importedText, importRowsOf, payloadBytes, setupFor } from "@/features/clients/import/import-data";
import { readSpreadsheet, SpreadsheetError, type SpreadsheetSheet } from "@/features/clients/import/read-spreadsheet";
import { ResultStep } from "@/features/clients/import/result-step";
import { ReviewStep } from "@/features/clients/import/review-step";
import { useCurrentBusiness, usePlanUsage } from "@/hooks/queries/use-account";
import { useClients, useImportClients } from "@/hooks/queries/use-clients";
import { useErrorToast } from "@/hooks/use-error-toast";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { clientRequiredFieldsOf } from "@/lib/constants/business";
import { DataError } from "@/lib/data";
import { cn } from "@/lib/utils";
import { classifyImportRows, type ImportTarget } from "@/lib/validations/client-import";
import type { ClientImportResult } from "@/types";

type Stage = "file" | "columns" | "review" | "result";

const STEPS: { stage: Exclude<Stage, "result">; label: string }[] = [
  { stage: "file", label: "Archivo" },
  { stage: "columns", label: "Columnas" },
  { stage: "review", label: "Revisión" },
];

/** El archivo leído y cómo se asignan sus columnas. Sólo en memoria: son datos de pacientes. */
interface Workbook {
  fileName: string;
  sheets: SpreadsheetSheet[];
  sheetIndex: number;
  headerIndex: number;
  columns: ImportTarget[];
}

/**
 * Importar pacientes desde un Excel o un CSV (spec 012), en tres pasos: el archivo, las columnas y la
 * revisión. Es una tarea de puesta en marcha: sólo el propietario, los administradores y el super admin
 * en modo soporte (`clients.import`). Nada del archivo ni de las filas se guarda en el navegador: si
 * se cierra la pantalla, se empieza otra vez.
 */
export default function ClientImportPage() {
  const { can } = usePermissions();
  return (
    <div className="space-y-6">
      <PageTitle title="Importar pacientes" />
      <Link
        to="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Clientes
      </Link>
      {can("clients.import") ? (
        <ClientImport />
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="Importar pacientes es del propietario y los administradores"
          description="Es una tarea de puesta en marcha del negocio. Pide a quien lo administra que cargue la lista."
          action={
            <Button asChild variant="outline">
              <Link to="/dashboard/clients">
                <ArrowLeft /> Volver a clientes
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

function ClientImport() {
  const { data: business } = useCurrentBusiness();
  const clientsQuery = useClients();
  const usageQuery = usePlanUsage();
  const importClients = useImportClients();
  const showError = useErrorToast();
  const [stage, setStage] = useState<Stage>("file");
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [result, setResult] = useState<ClientImportResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Al cambiar de paso, el foco va al título del paso (lector de pantalla y teclado).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stage]);

  const required = useMemo(() => clientRequiredFieldsOf(business), [business]);
  const timezone = business?.timezone ?? DEFAULT_TIMEZONE;
  const usage = usageQuery.data;
  const remaining = usage && usage.limits.clients !== null ? Math.max(0, usage.limits.clients - usage.clients) : null;
  const clients = clientsQuery.data;
  const names = useMemo(() => new Map((clients ?? []).map((client) => [client.id, client.name])), [clients]);
  const clientName = (clientId: string) => names.get(clientId);

  const sheet = workbook ? workbook.sheets[workbook.sheetIndex] : null;
  const rows = useMemo(
    () => (workbook && sheet && stage !== "file" ? importRowsOf(sheet, workbook.headerIndex, workbook.columns) : []),
    [workbook, sheet, stage],
  );
  const review = useMemo(
    () =>
      stage === "review" && clients && usage
        ? classifyImportRows(rows, { required, timezone, existing: clients, remaining })
        : null,
    [stage, rows, clients, usage, required, timezone, remaining],
  );
  const bytes = useMemo(() => (stage === "review" ? payloadBytes(rows) : 0), [stage, rows]);

  const openFile = async (file: File) => {
    setReading(true);
    setFileError(null);
    try {
      const { sheets } = await readSpreadsheet(file);
      const sheetIndex = defaultSheetIndex(sheets);
      setWorkbook({ fileName: file.name, sheets, sheetIndex, ...setupFor(sheets[sheetIndex] ?? { name: "", rows: [] }) });
      setStage("columns");
    } catch (error) {
      setFileError(error instanceof SpreadsheetError ? error.message : "No se pudo leer el archivo. Ábrelo en Excel y guárdalo de nuevo como .xlsx.");
    } finally {
      setReading(false);
    }
  };

  const runImport = async () => {
    if (!review) return;
    setUncertain(false);
    try {
      const imported = await importClients.mutateAsync({ rows });
      if (imported.created > 0) toast.success(importedText(imported.created));
      else toast.info(importedText(0));
      setResult(imported);
      setStage("result");
    } catch (error) {
      // Sin respuesta: puede que la API sí terminara. Repetir no duplica (lo que entró ya existe).
      if (error instanceof DataError && error.code === "network") setUncertain(true);
      else showError(error);
    }
  };

  const restart = () => {
    setWorkbook(null);
    setResult(null);
    setUncertain(false);
    setStage("file");
  };

  const current = STEPS.findIndex((step) => step.stage === stage);
  const titles: Record<Stage, string> = {
    file: "Importar pacientes",
    columns: "Revisa las columnas",
    review: "Revisa antes de importar",
    result: "Importación terminada",
  };
  const descriptions: Record<Stage, string> = {
    file: "Carga en un minuto la lista de pacientes que ya tienes en Excel o en un CSV.",
    columns: "Dinos qué dato es cada columna del archivo.",
    review: "Así quedará: se crean sólo los pacientes nuevos y válidos, y los que ya tienes no se tocan.",
    result: "Los pacientes importados ya están en tu lista.",
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Como PageHeader, pero el título recibe el foco al cambiar de paso. */}
        <div className="min-w-0 space-y-1">
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-extrabold tracking-[-0.02em] outline-none">
            {titles[stage]}
          </h1>
          <p className="text-muted-foreground">{descriptions[stage]}</p>
        </div>
        {stage !== "result" && (
          <ol aria-label="Pasos de la importación" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {STEPS.map((step, index) => (
              <li key={step.stage} aria-current={index === current ? "step" : undefined} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                    index === current
                      ? "bg-primary text-primary-foreground"
                      : index < current
                        ? "bg-accent text-ink"
                        : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className={cn(index === current ? "font-semibold" : "text-muted-foreground")}>{step.label}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {stage === "file" && <FileStep required={required} reading={reading} error={fileError} onFile={openFile} />}

      {stage === "columns" && workbook && (
        <ColumnsStep
          fileName={workbook.fileName}
          sheets={workbook.sheets}
          sheetIndex={workbook.sheetIndex}
          headerIndex={workbook.headerIndex}
          columns={workbook.columns}
          onSheet={(sheetIndex) => setWorkbook({ ...workbook, sheetIndex, ...setupFor(workbook.sheets[sheetIndex]) })}
          onColumns={(columns) => setWorkbook({ ...workbook, columns })}
          onBack={restart}
          onNext={() => setStage("review")}
        />
      )}

      {stage === "review" &&
        (clientsQuery.isError || usageQuery.isError ? (
          <ErrorState
            onRetry={() => {
              void clientsQuery.refetch();
              void usageQuery.refetch();
            }}
          />
        ) : review ? (
          <ReviewStep
            rows={rows}
            review={review}
            bytes={bytes}
            remaining={remaining}
            clientName={clientName}
            importing={importClients.isPending}
            uncertain={uncertain}
            onBack={() => {
              setUncertain(false);
              setStage("columns");
            }}
            onImport={runImport}
          />
        ) : (
          <ListSkeleton />
        ))}

      {stage === "result" && result && <ResultStep result={result} clientName={clientName} onAnother={restart} />}
    </div>
  );
}
