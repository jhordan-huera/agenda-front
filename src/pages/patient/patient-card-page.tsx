import { ErrorState } from "@/components/shared/error-state";
import { PageTitle } from "@/components/shared/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientAuth } from "@/features/patient/patient-auth";
import { PatientHome } from "@/features/patient/patient-home";
import { PatientShell } from "@/features/patient/patient-shell";
import { usePatientAccount } from "@/hooks/queries/use-patient-account";

/**
 * «Mi tarjeta» (/mi-tarjeta, spec 052): sin sesión, entrar o crear la cuenta del paciente (opcional: reservar no la
 * pide); con sesión, su tarjeta de fidelización (diseño B, «Tarjeta clara») o su QR si todavía no tiene ninguna.
 */
export default function PatientCardPage() {
  const accountQuery = usePatientAccount();

  if (accountQuery.isPending) {
    return (
      <PatientShell business={null}>
        <PageTitle title="Mi tarjeta" />
        <div role="status" aria-label="Cargando" className="space-y-4 pb-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </PatientShell>
    );
  }

  if (accountQuery.isError) {
    return (
      <PatientShell business={null}>
        <PageTitle title="Mi tarjeta" />
        <ErrorState className="mb-8" onRetry={() => accountQuery.refetch()} />
      </PatientShell>
    );
  }

  const account = accountQuery.data;
  if (!account) {
    return (
      <PatientShell business={null}>
        <PageTitle title="Mi tarjeta" />
        <PatientAuth />
      </PatientShell>
    );
  }

  return <PatientHome account={account} />;
}
