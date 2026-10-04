import { useState } from "react";
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
export function useAppointmentDialogs() {
  const [form, setForm] = useState<FormState>({ open: false });
  const [details, setDetails] = useState<{ id: string | null; open: boolean }>({ id: null, open: false });

  const openCreate = (defaults?: AppointmentDefaults) => setForm({ open: true, defaults });
  const openEdit = (appointment: Appointment) => {
    setDetails((current) => ({ ...current, open: false }));
    setForm({ open: true, appointment });
  };
  const openDetails = (appointment: Appointment) => setDetails({ id: appointment.id, open: true });

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
