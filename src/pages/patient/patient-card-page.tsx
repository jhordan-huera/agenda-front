import { useSearchParams } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { PageTitle } from "@/components/shared/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientAuth } from "@/features/patient/patient-auth";
import { PatientHome } from "@/features/patient/patient-home";
import { BrandThemeProvider } from "@/features/branding/brand-theme-provider";
import { PatientShell } from "@/features/patient/patient-shell";
import { usePatientAccount, usePatientInvite } from "@/hooks/queries/use-patient-account";
import { PATIENT_INVITE_PARAM } from "@/lib/constants/loyalty";

/**
 * «Mi tarjeta» (/mi-tarjeta, spec 052): sin sesión, entrar o crear la cuenta del paciente (opcional: reservar no la
 * pide); con sesión, su tarjeta de fidelización (diseño B, «Tarjeta clara») o su QR si todavía no tiene ninguna. Con
 * `?consultorio=<slug>` (el QR que el consultorio comparte), sin sesión: su logo, su nombre y sus colores, y «Crear mi
 * cuenta» primero.
 */
export default function PatientCardPage() {
  const accountQuery = usePatientAccount();
  const [searchParams] = useSearchParams();
  const inviteQuery = usePatientInvite(searchParams.get(PATIENT_INVITE_PARAM));
  const invite = inviteQuery.data ?? null;

  // Con el QR del consultorio, también se espera su nombre y su logo: la página no salta ni borra lo ya escrito.
  if (accountQuery.isPending || (inviteQuery.isPending && inviteQuery.fetchStatus !== "idle" && !accountQuery.data)) {
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
      <BrandThemeProvider colors={invite?.brandColors ?? null}>
        <PatientShell business={invite}>
          <PageTitle title="Mi tarjeta" />
          <PatientAuth invite={invite} />
        </PatientShell>
      </BrandThemeProvider>
    );
  }

  return <PatientHome account={account} />;
}
