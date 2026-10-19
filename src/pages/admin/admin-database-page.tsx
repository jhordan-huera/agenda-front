import { ArrowLeft, RotateCw, ShieldAlert } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DatabaseGrowthCard } from "@/features/admin/database/database-growth-card";
import { DatabaseMaintenanceCard } from "@/features/admin/database/database-maintenance-card";
import { DatabaseOverview } from "@/features/admin/database/database-overview";
import { DatabaseTablesCard } from "@/features/admin/database/database-tables-card";
import { DatabaseWorkCard } from "@/features/admin/database/database-work-card";
import { useSession } from "@/features/auth/use-session";
import { useAdminDatabase } from "@/hooks/queries/use-admin";
import { DataError, getErrorMessage } from "@/lib/data";
import { formatClockTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function NoAccess() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="No tienes acceso"
      description="Sólo el super admin principal ve la base de datos."
      action={
        <Button asChild variant="outline">
          <Link to="/admin">
            <ArrowLeft /> Volver al inicio
          </Link>
        </Button>
      }
    />
  );
}

/**
 * La pantalla «Base de datos» (spec 024), sólo para el super admin principal: qué ocupa la base frente a su
 * tope (y los archivos, aparte), cómo crece y cuándo se llenaría, qué la hace trabajar y su mantenimiento.
 * Se calcula al abrirla (y con «Actualizar»): sólo nombres de tablas, tamaños y cifras, nunca datos de filas.
 * Los demás super admins no ven el enlace, y si llegan por la dirección, «No tienes acceso» (la API les
 * responde 403 igualmente).
 */
export default function AdminDatabasePage() {
  const { session } = useSession();
  const isOwner = Boolean(session?.platformOwner);
  const database = useAdminDatabase(isOwner);
  const stats = database.data;
  const forbidden = database.error instanceof DataError && database.error.code === "forbidden";

  if (!isOwner || forbidden) {
    return (
      <div className="space-y-6">
        <PageTitle title="Base de datos" />
        <NoAccess />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Base de datos" />
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Inicio
      </Link>
      <PageHeader
        title="Base de datos"
        description={
          <>
            Qué ocupa, qué la hace trabajar y cuándo se llenaría.
            <span className="block text-xs">
              {stats ? `Medida a las ${formatClockTime(stats.computedAt)}. ` : ""}Sólo nombres de tablas y cifras, nunca datos de pacientes.
            </span>
          </>
        }
        actions={
          <Button variant="outline" onClick={() => database.refetch()} disabled={database.isFetching}>
            <RotateCw className={cn(database.isFetching && "animate-spin")} /> Actualizar
          </Button>
        }
      />

      {stats && database.isError && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm">
          No se pudo actualizar: {getErrorMessage(database.error)} Se ve la medida anterior.
        </p>
      )}

      {database.isPending ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : !stats ? (
        <ErrorState description={getErrorMessage(database.error, "Revisa tu conexión e inténtalo de nuevo.")} onRetry={() => database.refetch()} />
      ) : (
        <>
          <DatabaseOverview stats={stats} />
          <DatabaseGrowthCard stats={stats} />
          <DatabaseTablesCard stats={stats} />
          <DatabaseWorkCard stats={stats} />
          <DatabaseMaintenanceCard stats={stats} />
        </>
      )}
    </div>
  );
}
