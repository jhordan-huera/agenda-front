import { CircleAlert, Receipt } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { AwsCostAlertCard } from "@/features/admin/costs/aws-cost-alert-card";
import { AwsMonthCard, AwsPlanCard, AwsServicesCard } from "@/features/admin/costs/aws-costs-sections";
import { useAwsCosts } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import type { AwsCosts } from "@/types";

/** «No se pudo actualizar», con el motivo en palabras sencillas (lo guarda el cron) y cuándo fue el intento. */
function UpdateError({ costs }: { costs: AwsCosts }) {
  if (!costs.lastError) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">
          No se pudo actualizar{costs.lastAttemptAt ? ` (último intento: ${formatDateTime(costs.lastAttemptAt)})` : ""}
        </p>
        <p className="text-muted-foreground">
          {costs.lastError}. {costs.latest ? "Se ven los últimos costos guardados; el cron lo vuelve a intentar solo." : "El cron lo vuelve a intentar solo."}
        </p>
      </div>
    </div>
  );
}

/**
 * La página «Costos» del super admin (spec 031): lo que cuesta el backend en AWS este mes, sin entrar a AWS. Lo
 * gastado con la previsión y el aviso, el plan de AWS con sus créditos, el desglose por servicio y el monto del
 * aviso de gasto. Lo actualiza el cron una vez al día (sin botón: cada consulta a AWS cuesta $0,01), así que
 * abrirla no consulta a AWS. Sin datos todavía, explica por qué; si la última actualización falló, lo dice y
 * muestra lo último guardado.
 */
export default function AdminCostsPage() {
  const query = useAwsCosts();
  const costs = query.data;

  return (
    <div className="space-y-6">
      <PageTitle title="Costos" />
      <PageHeader
        title="Costos"
        description={
          <>
            Lo que cuesta el backend en AWS este mes, sin entrar a AWS.
            <span className="block text-xs">Se actualiza solo una vez al día, desde las 06:00 (hora de Ecuador).</span>
          </>
        }
      />

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" role="status" aria-label="Cargando">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : !costs ? (
        <ErrorState description={getErrorMessage(query.error, "Revisa tu conexión e inténtalo de nuevo.")} onRetry={() => query.refetch()} />
      ) : (
        <>
          <UpdateError costs={costs} />
          {costs.latest ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <AwsMonthCard costs={costs} latest={costs.latest} className="lg:col-span-2" />
              <AwsPlanCard latest={costs.latest} />
              <AwsServicesCard latest={costs.latest} className="lg:col-span-2" />
              <AwsCostAlertCard costs={costs} />
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
              <EmptyState
                icon={Receipt}
                title="Aún no hay costos"
                description="El cron los actualiza solo una vez al día, desde las 06:00 (hora de Ecuador), y hace falta el permiso de AWS para leerlos: los pasos están en el README del backend, «Los costos de AWS». Mientras tanto ya puedes poner el aviso de gasto."
                className="lg:col-span-2"
              />
              <AwsCostAlertCard costs={costs} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
