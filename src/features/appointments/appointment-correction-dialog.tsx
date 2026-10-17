import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCorrectAppointmentStatus } from "@/hooks/queries/use-appointments";
import { useErrorToast } from "@/hooks/use-error-toast";
import { APPOINTMENT_STATUS_CONFIG, CORRECTABLE_FROM_COMPLETED, type CorrectableStatus } from "@/lib/constants/appointment-status";
import { appointmentCorrectionSchema, CORRECTION_REASON_MAX, CORRECTION_REASON_MIN } from "@/lib/validations/appointment";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { Appointment } from "@/types";

interface AppointmentCorrectionDialogProps {
  appointment: Appointment;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * «Corregir estado» de una cita completada (spec 020), sólo para el propietario y el super admin en modo
 * soporte: el estado correcto, el motivo (de 10 a 300 caracteres, queda en la actividad) y «Avisar al
 * paciente», apagada: es un arreglo interno.
 */
export function AppointmentCorrectionDialog({ appointment, clientName, open, onOpenChange }: AppointmentCorrectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Corregir estado</DialogTitle>
          <DialogDescription>
            La cita de {clientName} está completada. Elige el estado correcto y escribe el motivo: queda en la actividad.
          </DialogDescription>
        </DialogHeader>
        {/* Cada vez que se abre, de cero: nada del intento anterior. */}
        {open && <CorrectionForm appointment={appointment} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CorrectionForm({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const correct = useCorrectAppointmentStatus();
  const showError = useErrorToast();
  const [status, setStatus] = useState<CorrectableStatus | "">("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const length = reason.trim().length;
  // El error de un campo se va al cambiarlo (si no, quedaba en rojo con el valor ya bien).
  const clearError = (field: string) =>
    setErrors((current) => {
      const { [field]: _removed, ...rest } = current;
      return rest;
    });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(appointmentCorrectionSchema, { status, reason, notify });
    setErrors(result.errors);
    if (!result.success || correct.isPending) return;
    try {
      const saved = await correct.mutateAsync({ id: appointment.id, input: result.data });
      toast.success(`Estado corregido: ${APPOINTMENT_STATUS_CONFIG[saved.status].label}`, {
        description: result.data.notify ? undefined : "Sin avisar al paciente.",
      });
      onDone();
    } catch (error) {
      showError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField label="Estado correcto" error={errors.status}>
        {(field) => (
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as CorrectableStatus);
              clearError("status");
            }}
          >
            <SelectTrigger {...field} className="w-full">
              <SelectValue placeholder="Elige el estado" />
            </SelectTrigger>
            <SelectContent position="popper">
              {CORRECTABLE_FROM_COMPLETED.map((option) => (
                <SelectItem key={option} value={option}>
                  <span className={`size-2 rounded-full ${APPOINTMENT_STATUS_CONFIG[option].dot}`} aria-hidden />
                  {APPOINTMENT_STATUS_CONFIG[option].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField label="Motivo" error={errors.reason} hint={`De ${CORRECTION_REASON_MIN} a ${CORRECTION_REASON_MAX} caracteres.`}>
        {(field) => (
          <div className="grid gap-1">
            <Textarea
              {...field}
              rows={3}
              maxLength={CORRECTION_REASON_MAX}
              placeholder="Ej.: se marcó como completada por error; el paciente no vino."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                clearError("reason");
              }}
            />
            {/* El contador, siempre a la vista (también con el error debajo). */}
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              {length}/{CORRECTION_REASON_MAX}
            </p>
          </div>
        )}
      </FormField>

      <div className="flex items-start gap-2">
        <Checkbox
          id="correction-notify"
          checked={notify}
          onCheckedChange={(checked) => setNotify(checked === true)}
          aria-describedby="correction-notify-hint"
          className="mt-0.5"
        />
        <div className="grid gap-0.5">
          <Label htmlFor="correction-notify" className="font-normal">
            Avisar al paciente
          </Label>
          <p id="correction-notify-hint" className="text-xs text-muted-foreground">
            Apagada: la corrección es un arreglo interno. Márcala para enviarle el email del nuevo estado y el WhatsApp ya escrito.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Volver
        </Button>
        <SubmitButton loading={correct.isPending}>Corregir estado</SubmitButton>
      </DialogFooter>
    </form>
  );
}
