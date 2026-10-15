import { CalendarPlus, Loader2, UserCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatClockTime, formatDayMonth } from "@/lib/format";
import type { PublicAppointment } from "@/types";
import { BusinessContact } from "./business-contact";
import { dayAndTimeOf, reachOf } from "./patient-appointment-utils";

/**
 * «Confirmo que voy» (spec 010): mientras la cita esté activa y no haya confirmado, el botón; si ya
 * confirmó, cuándo. No cambia el estado de la cita: confirmarla sigue siendo del negocio.
 */
export function AttendanceSection({
  appointment,
  pending,
  onConfirm,
}: {
  appointment: PublicAppointment;
  pending: boolean;
  onConfirm: () => void;
}) {
  if (!appointment.canConfirm) return null;
  const { timezone } = appointment.business;
  if (appointment.confirmedAt) {
    return (
      <p className="flex items-start gap-2 rounded-2xl border bg-background p-5 text-sm">
        <UserCheck className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
        <span>
          Confirmaste que vas el {formatDayMonth(appointment.confirmedAt, timezone)} a las{" "}
          {formatClockTime(appointment.confirmedAt, timezone)}.
        </span>
      </p>
    );
  }
  return (
    <section aria-labelledby="attendance-heading" className="space-y-3 rounded-2xl border bg-background p-5 sm:p-6">
      <h2 id="attendance-heading" className="font-semibold">
        ¿Vienes a tu cita?
      </h2>
      <p className="text-sm text-muted-foreground">Avísale a {appointment.business.name} que te espere.</p>
      <Button size="lg" className="w-full sm:w-auto" disabled={pending} onClick={onConfirm}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <UserCheck />} Confirmo que voy
      </Button>
    </section>
  );
}

/**
 * Cancelar desde «Tu cita» (spec 010). Lo decide el servidor (`cancellation.status`): sólo el paciente
 * principal, si el negocio permite cancelaciones y aún falta más que su antelación. Si no, el contacto
 * del negocio para avisarle. Pide confirmarlo: la hora queda libre para otra persona.
 */
export function CancellationSection({
  appointment,
  onCancel,
}: {
  appointment: PublicAppointment;
  /** Si falla, el diálogo queda abierto (el error lo muestra quien cancela). */
  onCancel: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const { cancellation, business } = appointment;
  const reach = reachOf(business);

  const body = (() => {
    switch (cancellation.status) {
      case "allowed":
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {cancellation.policy ||
                (cancellation.noticeHours > 0
                  ? `Puedes cancelar hasta ${cancellation.noticeHours} h antes de la cita.`
                  : "Puedes cancelar hasta la hora de la cita.")}
            </p>
            <Button variant="outline" className="w-full text-destructive hover:text-destructive sm:w-auto" onClick={() => setConfirming(true)}>
              <XCircle /> Cancelar mi cita
            </Button>
          </div>
        );
      case "too_late":
        return <BusinessContact appointment={appointment} message={`Para cancelar con menos de ${cancellation.noticeHours} h, ${reach}.`} />;
      case "disabled":
        return <BusinessContact appointment={appointment} message={`Si no puedes asistir, ${reach}.`} />;
      case "not_main":
        return <BusinessContact appointment={appointment} message={`Para no asistir, ${reach}.`} />;
      case "closed":
        return null;
    }
  })();
  if (!body) return null;

  return (
    <section aria-labelledby="cancellation-heading" className="space-y-3 rounded-2xl border bg-background p-5 text-sm sm:p-6">
      <h2 id="cancellation-heading" className="text-base font-semibold">
        ¿No puedes ir?
      </h2>
      {body}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`¿Seguro que quieres cancelar tu cita del ${dayAndTimeOf(appointment)}?`}
        description="La hora quedará libre para otra persona."
        confirmLabel="Sí, cancelar mi cita"
        cancelLabel="Volver"
        destructive
        onConfirm={onCancel}
      />
    </section>
  );
}

/** Una cita cancelada, atendida, a la que no asistió o que ya pasó: sin botones sobre ella, sólo reservar otra. */
export function ClosedNotice({ appointment }: { appointment: PublicAppointment }) {
  const cancelled = appointment.status === "cancelled";
  return (
    <section className="space-y-3 rounded-2xl border bg-background p-5 text-sm sm:p-6">
      <p className="text-base font-semibold">{cancelled ? "Esta cita fue cancelada." : "Esta cita ya pasó."}</p>
      <BookAgainButton slug={appointment.business.slug} label={cancelled ? "Elegir otra hora" : "Reservar otra cita"} />
    </section>
  );
}

/** A la página de reservas del negocio: «Reprogramar» en esta versión es cancelar y elegir otra hora. */
export function BookAgainButton({ slug, label }: { slug: string; label: string }) {
  return (
    <Button asChild className="w-full sm:w-auto">
      <Link to={`/book/${slug}`}>
        <CalendarPlus /> {label}
      </Link>
    </Button>
  );
}
