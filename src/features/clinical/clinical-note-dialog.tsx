import { Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getServiceName } from "@/features/appointments/appointment-utils";
import { useAppointments } from "@/hooks/queries/use-appointments";
import { useAddClinicalNote } from "@/hooks/queries/use-clinical";
import { useLookups } from "@/hooks/queries/use-lookups";
import { getErrorMessage } from "@/lib/data";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useBusinessNow } from "@/hooks/use-business-now";
import { capitalize, formatNumericDate, formatShortDate } from "@/lib/format";
import { clinicalNoteSchema, type ClinicalNoteInput } from "@/lib/validations/clinical";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import { NOTE_FIELDS } from "./clinical-labels";

interface ClinicalNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  /** Cita a la que se une la evolución (p. ej. desde el detalle de la cita). */
  appointmentId?: string | null;
}

export function ClinicalNoteDialog({ open, onOpenChange, ...props }: ClinicalNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {open && <ClinicalNoteForm {...props} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

const NO_APPOINTMENT = "none";

function ClinicalNoteForm({
  clientId,
  clientName,
  appointmentId = null,
  onDone,
}: Omit<ClinicalNoteDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const addNote = useAddClinicalNote(clientId);
  const { data: appointments = [] } = useAppointments({ clientId });
  const { servicesById } = useLookups();
  // La fecha de la evolución es siempre la de hoy (la pone la API): no se puede fechar con retraso.
  const { data: business } = useCurrentBusiness();
  const today = useBusinessNow(business?.timezone).date;
  const [values, setValues] = useState<ClinicalNoteInput>({
    appointmentId,
    reason: "",
    findings: "",
    diagnosis: "",
    treatment: "",
    indications: "",
    nextControl: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof ClinicalNoteInput>(key: K, value: ClinicalNoteInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  // Citas del paciente que no están canceladas, de la más reciente a la más antigua.
  const linkable = appointments.filter((a) => a.status !== "cancelled").toReversed();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(clinicalNoteSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      await addNote.mutateAsync(result.data);
      toast.success("Evolución registrada");
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Nueva evolución</DialogTitle>
        <DialogDescription>Historia clínica de {clientName}.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="grid content-start gap-1.5">
          <p className="text-sm font-medium">Fecha</p>
          <p className="flex h-8 items-center gap-2 rounded-lg border bg-muted/40 px-2.5 text-sm" title="La pone el sistema: no se puede cambiar">
            <Lock className="size-3.5 text-muted-foreground" aria-hidden /> {formatNumericDate(today)}
          </p>
        </div>
        <FormField label="Cita" hint="Une la evolución a la consulta en la que se hizo.">
          {(field) => (
            <Select
              value={values.appointmentId ?? NO_APPOINTMENT}
              onValueChange={(value) => {
                const appointment = linkable.find((a) => a.id === value);
                setValues((current) => ({ ...current, appointmentId: appointment?.id ?? null }));
              }}
            >
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-64">
                <SelectItem value={NO_APPOINTMENT}>Sin cita</SelectItem>
                {linkable.map((appointment) => (
                  <SelectItem key={appointment.id} value={appointment.id}>
                    {capitalize(formatShortDate(appointment.date))} · {appointment.startTime} ·{" "}
                    {getServiceName(servicesById, appointment.serviceId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>
      {NOTE_FIELDS.map(({ key, label }) =>
        key === "nextControl" ? (
          <FormField key={key} label={label} error={errors[key]} optional>
            {(field) => (
              <Input {...field} placeholder="Ej.: en 15 días" value={values[key]} onChange={(e) => set(key, e.target.value)} />
            )}
          </FormField>
        ) : (
          <FormField key={key} label={label} error={errors[key]} optional={key !== "reason"}>
            {(field) => (
              <Textarea
                {...field}
                autoFocus={key === "reason"}
                rows={key === "reason" || key === "diagnosis" ? 2 : 3}
                value={values[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            )}
          </FormField>
        ),
      )}
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Una vez guardada, la evolución no se puede editar ni borrar. Si hay que corregir algo, añade una aclaración.
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={addNote.isPending}>Guardar evolución</SubmitButton>
      </DialogFooter>
    </form>
  );
}
