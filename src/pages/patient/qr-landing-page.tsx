import { QrCode } from "lucide-react";
import { Link, Navigate, useParams } from "react-router";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/use-session";
import { PatientShell } from "@/features/patient/patient-shell";
import { readQrToken } from "@/lib/constants/loyalty";

/**
 * /q/:token (spec 052): el enlace del QR del paciente, por si el profesional lo escanea con la cámara del celular.
 * Con la sesión del equipo iniciada, lleva a «Escanear» con el token; sin ella, una página neutra que no muestra ningún
 * dato (ni siquiera si el QR existe).
 */
export default function QrLandingPage() {
  const { token = "" } = useParams<{ token: string }>();
  const { status, session } = useSession();
  const qr = readQrToken(token);

  if (status === "loading") return <FullPageLoader />;
  if (status === "authenticated" && session?.businessId && qr) {
    return <Navigate to={`/dashboard/escanear?qr=${qr}`} replace />;
  }

  const loginPath = qr ? `/login?next=${encodeURIComponent(`/dashboard/escanear?qr=${qr}`)}` : "/login";
  return (
    <PatientShell business={null}>
      <PageTitle title="QR de una tarjeta de paciente" />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-10 text-center">
        <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <QrCode className="size-7" />
        </span>
        <div>
          <h1 className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em]">Este QR es de la tarjeta de un paciente</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Se muestra en el consultorio: el profesional lo escanea en la cita para registrar la visita.
          </p>
        </div>
        <Button asChild size="lg" className="h-11">
          <Link to="/mi-tarjeta">Ir a mi tarjeta</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          ¿Trabajas en el consultorio?{" "}
          <Link
            to={loginPath}
            className="relative rounded-sm font-semibold text-ink underline-offset-4 outline-none before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Inicia sesión para escanearlo
          </Link>
        </p>
      </div>
    </PatientShell>
  );
}
