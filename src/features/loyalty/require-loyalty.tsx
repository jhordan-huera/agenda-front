import { Gift } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentBusiness } from "@/hooks/queries/use-account";

/**
 * «Fidelización» y «Escanear» sólo en los negocios con la tarjeta habilitada por el super admin (spec 052, migración
 * 060). Sin ella, lo dice en vez de pedirle nada a la API (que respondería 403 con LOYALTY_NOT_ALLOWED_MESSAGE).
 * `title`: el de la página.
 */
export function RequireLoyalty({ title, children }: { title: string; children: ReactNode }) {
  const businessQuery = useCurrentBusiness();
  if (businessQuery.isPending) {
    return (
      <div role="status" aria-label="Cargando" className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }
  if (businessQuery.isError) return <ErrorState onRetry={() => businessQuery.refetch()} />;
  if (businessQuery.data?.loyaltyAllowed) return children;
  return (
    <div className="space-y-6">
      <PageTitle title={title} />
      <PageHeader title={title} />
      <EmptyState
        icon={Gift}
        title="La tarjeta de fidelización no está habilitada"
        description="Es para los consultorios que la piden. Si la quieres para el tuyo, pídela a Agenda360."
        className="max-w-xl"
      />
    </div>
  );
}
