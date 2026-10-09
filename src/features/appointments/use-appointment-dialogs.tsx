import { useState } from "react";
import { settleAppointmentMove } from "@/hooks/queries/use-appointments";
import type { Appointment } from "@/types";
import { AppointmentDetailsSheet } from "./appointment-details-sheet";
import { AppointmentFormDialog, type AppointmentDefaults } from "./appointment-form-dialog";

interface FormState {
  open: boolean;
  appointment?: Appointment;
  defaults?: AppointmentDefaults;
}

/**
 * Orquesta el formulario de cita y el panel de detalle para cualquier pantalla.
 * Devuelve las acciones y el JSX de los diálogos para renderizarlo una vez.
 */
/** `initialDetailsId`: cita cuya ficha se abre al entrar (p. ej. el enlace de un email). */
export function useAppointmentDialogs(initialDetailsId?: string | null) {
  const [form, setForm] = useState<FormState>({ open: false });
  const [details, setDetails] = useState<{ id: string | null; open: boolean }>(() => ({
    id: initialDetailsId ?? null,
    open: Boolean(initialDetailsId),
  }));

  const openCreate = (defaults?: AppointmentDefaults) => setForm({ open: true, defaults });
  // Una cita recién movida en la agenda se guarda ya al abrirla: lo que se haga en su ficha o en el
  // formulario parte de su nuevo sitio y el guardado diferido no lo pisa.
  const openEdit = (appointment: Appointment) => {
    void settleAppointmentMove(appointment.id);
    setDetails((current) => ({ ...current, open: false }));
    setForm({ open: true, appointment });
  };
  const openDetails = (appointment: Appointment) => {
    void settleAppointmentMove(appointment.id);
    setDetails({ id: appointment.id, open: true });
  };

  const dialogs = (
    <>
      <AppointmentFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
        appointment={form.appointment}
        defaults={form.defaults}
      />
      <AppointmentDetailsSheet
        appointmentId={details.id}
        open={details.open}
        onOpenChange={(open) => setDetails((current) => ({ ...current, open }))}
        onEdit={openEdit}
      />
    </>
  );

  return { openCreate, openEdit, openDetails, dialogs };
}
