import { LinkIcon, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandThemeProvider } from "@/features/branding/brand-theme-provider";
import {
  AttendanceSection,
  BookAgainButton,
  CancellationSection,
  ClosedNotice,
} from "@/features/patient-appointment/appointment-actions";
import { AppointmentSummaryCard } from "@/features/patient-appointment/appointment-summary-card";
import { dayAndTimeOf, type AppointmentOutcome } from "@/features/patient-appointment/patient-appointment-utils";
import { useCancelAppointment, useConfirmAppointment, usePublicAppointment } from "@/hooks/queries/use-public-booking";
import { DataError, getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * «Tu cita» (/cita/:token, spec 010): el enlace privado que llega en los emails de una cita activa, sin
 * sesión. El paciente ve su cita, confirma que va o la cancela si el negocio lo permite y aún está en
 * plazo; si no, el WhatsApp o el teléfono del negocio. Con `?confirmar=1` (el botón «Confirmo que voy»
 * del recordatorio) confirma al abrir y quita el parámetro de la dirección.
 */
export default function AppointmentPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = usePublicAppointment(token);
  const confirm = useConfirmAppointment(token);
  const cancel = useCancelAppointment(token);
  const [outcome, setOutcome] = useState<AppointmentOutcome | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const confirmOnOpen = useRef(searchParams.get("confirmar") === "1");
  const appointment = query.data;
  const { refetch } = query;
  const { mutate: sendConfirm } = confirm;

  const confirmAttendance = useCallback(() => {
    sendConfirm(undefined, {
      onSuccess: (result) => setOutcome(result.already ? "already_confirmed" : "confirmed"),
      // P. ej. la cita se canceló o empezó mientras tanto: se muestra cómo está ahora.
      onError: (error) => {
        toast.error(getErrorMessage(error));
        void refetch();
      },
    });
  }, [sendConfirm, refetch]);

  const cancelAppointment = async () => {
    try {
      const result = await cancel.mutateAsync();
      setOutcome(result.already ? null : "cancelled");
    } catch (error) {
      // Pudo abrir la página antes del plazo: se muestra cómo está ahora (p. ej. el contacto del negocio).
      toast.error(getErrorMessage(error));
      void refetch();
      throw error;
    }
  };

  // «Confirmo que voy» del recordatorio: confirma en cuanto se sabe cómo está la cita y deja la dirección
  // sin ?confirmar=1 (recargar no lo repite, aunque repetirlo tampoco cambiaría nada).
  useEffect(() => {
    if (!confirmOnOpen.current || !appointment) return;
    confirmOnOpen.current = false;
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete("confirmar");
        return next;
      },
      { replace: true },
    );
    if (appointment.canConfirm) confirmAttendance();
  }, [appointment, confirmAttendance, setSearchParams]);

  // El resultado se anuncia (role="status") y recibe el foco, también con lector de pantalla.
  useEffect(() => {
    if (outcome) messageRef.current?.focus();
  }, [outcome]);

  if (query.isPending) {
    return (
      <div className="min-h-screen bg-muted p-4" role="status" aria-label="Cargando">
        <div className="mx-auto grid max-w-xl gap-4 py-8">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!appointment) {
    // Lo mismo si no existe, si caducó o si el negocio está suspendido: la API no los distingue.
    const notFound = query.error instanceof DataError && query.error.code === "not_found";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <PageTitle title={notFound ? "Enlace no disponible" : "Tu cita"} />
        <Logo />
        {notFound ? (
          <EmptyState
            icon={LinkIcon}
            className="w-full max-w-md"
            title="Este enlace no está disponible"
            description="Revisa que el enlace esté completo o escríbele al negocio."
          />
        ) : (
          <ErrorState className="w-full max-w-md" onRetry={() => refetch()} />
        )}
      </div>
    );
  }

  const { business } = appointment;
  const open = appointment.cancellation.status !== "closed";

  return (
    <BrandThemeProvider colors={business.brandColors}>
      <div className="flex min-h-screen flex-col bg-muted">
        <PageTitle title={`Tu cita · ${business.name}`} />
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-xl items-center gap-4 px-4 py-6">
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={`Logo de ${business.name}`}
                className="h-14 w-auto max-w-40 shrink-0 rounded-xl border bg-white object-contain p-1"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{business.name}</p>
              <h1 className="text-2xl leading-tight font-extrabold tracking-[-0.02em]">Tu cita</h1>
            </div>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-4 px-4 py-6">
          {/* Siempre en la página (oculta si no hay nada que decir): así el lector de pantalla anuncia lo que aparece. */}
          <div ref={messageRef} tabIndex={-1} role="status" aria-live="polite" className={cn("outline-none", !outcome && "sr-only")}>
            {outcome && (
              <div className="space-y-3 rounded-2xl border border-primary/30 bg-accent p-5 text-ink">
                <p className="text-lg leading-snug font-bold">
                  {outcome === "confirmed"
                    ? `¡Gracias! Te esperamos el ${dayAndTimeOf(appointment)}.`
                    : outcome === "already_confirmed"
                      ? `Ya nos habías confirmado que vienes. Te esperamos el ${dayAndTimeOf(appointment)}.`
                      : "Tu cita quedó cancelada. Te enviamos un email con la cancelación."}
                </p>
                {outcome === "cancelled" && <BookAgainButton slug={business.slug} label="Elegir otra hora" />}
              </div>
            )}
          </div>

          <AppointmentSummaryCard appointment={appointment} />

          {!outcome && <AttendanceSection appointment={appointment} pending={confirm.isPending} onConfirm={confirmAttendance} />}

          {appointment.payment && (
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto sm:justify-self-start">
              <Link to={`/pago/${token}`}>
                <Wallet /> Pagar la cita
              </Link>
            </Button>
          )}

          {open ? (
            <CancellationSection appointment={appointment} onCancel={cancelAppointment} />
          ) : (
            outcome !== "cancelled" && <ClosedNotice appointment={appointment} />
          )}
        </main>
      </div>
    </BrandThemeProvider>
  );
}
