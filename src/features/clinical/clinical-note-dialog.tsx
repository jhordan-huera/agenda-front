import { Lock } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getServiceName } from "@/features/appointments/appointment-utils";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments } from "@/hooks/queries/use-appointments";
import { useAddClinicalNote, useClinicalRecord, useClinicalTemplates } from "@/hooks/queries/use-clinical";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBusinessNow } from "@/hooks/use-business-now";
import { businessTemplate } from "@/lib/clinical-templates";
import { DataError, getErrorMessage } from "@/lib/data";
import { capitalize, formatNumericDate, formatShortDate } from "@/lib/format";
import { CLINICAL_NOTE_DATE_WINDOW_DAYS, clinicalNoteDataSchema, clinicalNoteDateRange } from "@/lib/validations/clinical";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { ClinicalField, ClinicalRecord, ClinicalTemplate, OdontogramValue } from "@/types";
import { ClinicalFieldInput } from "./clinical-field-input";
import { initialClinicalValues, type ClinicalFormValues } from "./clinical-form-values";

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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {open && <ClinicalNoteLoader {...props} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

type FormProps = Omit<ClinicalNoteDialogProps, "open" | "onOpenChange"> & { onDone: () => void };

/** Espera las plantillas (y la historia, para partir del último odontograma). */
function ClinicalNoteLoader(props: FormProps) {
  const templates = useClinicalTemplates();
  const record = useClinicalRecord(props.clientId);

  if (templates.isError) {
    return <ErrorState title="No pudimos cargar los formatos de evolución" onRetry={() => templates.refetch()} />;
  }
  if (templates.isPending || record.isPending) {
    return (
      <div className="grid gap-4" role="status" aria-label="Cargando">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  return (
    <ClinicalNoteForm
      {...props}
      templates={templates.data}
      record={record.data}
      initialTemplateId={businessTemplate(templates.data)?.id}
      onTemplatesOutdated={() => void templates.refetch()}
    />
  );
}

const NO_APPOINTMENT = "none";

/** Último odontograma registrado del paciente (en cualquier formato), si lo hay. */
function findLastOdontogram(record?: ClinicalRecord): { value: OdontogramValue; date: string } | null {
  for (const note of record?.notes ?? []) {
    const field = record?.templateVersions[note.templateVersionId]?.fields.find(
      (candidate) => candidate.type === "odontogram" && note.data[candidate.id] !== undefined,
    );
    if (field) return { value: note.data[field.id] as OdontogramValue, date: note.date };
  }
  return null;
}

function ClinicalNoteForm({
  clientId,
  clientName,
  appointmentId = null,
  onDone,
  templates,
  record,
  initialTemplateId,
  onTemplatesOutdated,
}: FormProps & {
  templates: ClinicalTemplate[];
  record?: ClinicalRecord;
  /** El formato de todo el negocio. */
  initialTemplateId?: string;
  onTemplatesOutdated: () => void;
}) {
  const addNote = useAddClinicalNote(clientId);
  const { data: appointments = [] } = useAppointments({ clientId });
  const { servicesById } = useLookups();
  // La fecha de la consulta: hoy por defecto, hasta 30 días atrás y nunca futura (spec 037).
  const { data: business } = useCurrentBusiness();
  const today = useBusinessNow(business?.timezone).date;
  const dateRange = clinicalNoteDateRange(today);
  const inDateRange = (value: string) => value >= dateRange.min && value <= dateRange.max;
  // Mientras no se elija a mano, la de la cita unida (si cabe) o la de hoy.
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string>();
  // Mientras no se elija un formato a mano, se usa el del negocio.
  const [chosenTemplateId, setChosenTemplateId] = useState<string | null>(null);
  const [linkedAppointment, setLinkedAppointment] = useState<string | null>(appointmentId);
  // Lo escrito en cada formato se conserva al cambiar de uno a otro.
  const [valuesByTemplate, setValuesByTemplate] = useState<Record<string, ClinicalFormValues>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  const templateId = chosenTemplateId ?? initialTemplateId;
  const template = templates.find((t) => t.id === templateId);
  const businessDefault = templates.find((t) => t.id === initialTemplateId);
  // Por qué se usa este formato (se muestra bajo el selector).
  const templateReason =
    templateId === initialTemplateId
      ? "Es el formato de tu negocio."
      : `Elegido sólo para esta evolución. El de tu negocio es «${businessDefault?.name}».`;
  // El odontograma parte del último registrado: sólo se actualiza lo que cambió.
  const lastOdontogram = findLastOdontogram(record);
  const hasOdontogram = Boolean(template?.fields.some((field) => field.type === "odontogram"));
  const initialValues = (fields: ClinicalField[]) => {
    const initial = initialClinicalValues(fields);
    for (const field of fields) {
      if (field.type === "odontogram" && lastOdontogram) initial[field.id] = structuredClone(lastOdontogram.value);
    }
    return initial;
  };
  const values = template ? (valuesByTemplate[template.id] ?? initialValues(template.fields)) : {};
  // El del negocio va primero y aparte; el resto, por grupos.
  const rest = templates.filter((t) => t.id !== initialTemplateId);
  const own = rest.filter((t) => t.businessId !== null);
  const recommended = rest.filter((t) => t.businessId === null && t.recommended);
  const others = rest.filter((t) => t.businessId === null && !t.recommended);
  // Citas del paciente que no están canceladas, de la más reciente a la más antigua.
  const linkable = appointments.filter((a) => a.status !== "cancelled").toReversed();
  const linkedDate = appointments.find((a) => a.id === linkedAppointment)?.date;
  const date = chosenDate ?? (linkedDate && inDateRange(linkedDate) ? linkedDate : today);

  const setValue = (id: string, value: unknown) => {
    if (!template) return;
    setValuesByTemplate((current) => ({ ...current, [template.id]: { ...values, [id]: value } }));
    setErrors((current) => {
      if (!(id in current) && !("form" in current)) return current;
      const next = { ...current };
      delete next[id];
      delete next.form;
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!template) return;
    const result = validate(clinicalNoteDataSchema(template.fields), values);
    setErrors(result.errors);
    const nextDateError = !date
      ? "Elige la fecha de la consulta."
      : date > dateRange.max
        ? "La fecha de la consulta no puede ser futura."
        : date < dateRange.min
          ? `Puede ser de hasta ${CLINICAL_NOTE_DATE_WINDOW_DAYS} días atrás: desde el ${formatNumericDate(dateRange.min)}.`
          : undefined;
    setDateError(nextDateError);
    if (!result.success || nextDateError) {
      // Lleva al primer campo con error (las plantillas pueden ser largas).
      requestAnimationFrame(() => {
        const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [id$="-error"], [role="alert"]');
        invalid?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    try {
      await addNote.mutateAsync({ appointmentId: linkedAppointment, date, templateVersionId: template.versionId, data: result.data });
      toast.success("Evolución registrada");
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
      // La plantilla cambió mientras se escribía: se recargan los formatos (lo escrito se conserva).
      if (error instanceof DataError && error.code === "conflict") onTemplatesOutdated();
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Nueva evolución</DialogTitle>
        <DialogDescription>Historia clínica de {clientName}.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
        <FormField label="Formato" hint={template && <span data-testid="template-reason">{templateReason}</span>}>
          {(field) => (
            <Select
              value={templateId}
              onValueChange={(id) => {
                setChosenTemplateId(id);
                setErrors({});
              }}
            >
              <SelectTrigger {...field} className="w-full">
                <SelectValue placeholder="Elige un formato" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80">
                {businessDefault && (
                  <SelectGroup>
                    <SelectLabel>Formato de tu negocio</SelectLabel>
                    <SelectItem value={businessDefault.id}>{businessDefault.name}</SelectItem>
                  </SelectGroup>
                )}
                {own.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Creados por ti</SelectLabel>
                    {own.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {recommended.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Para tu especialidad</SelectLabel>
                    {recommended.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                <SelectGroup>
                  <SelectLabel>Otros formatos</SelectLabel>
                  {others.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label="Fecha de la consulta" error={dateError}>
          {(field) => (
            <Input
              {...field}
              type="date"
              min={dateRange.min}
              max={dateRange.max}
              value={date}
              onChange={(e) => {
                setChosenDate(e.target.value);
                setDateError(undefined);
              }}
            />
          )}
        </FormField>
      </div>

      <FormField label="Cita" hint="Une la evolución a la consulta en la que se hizo.">
        {(field) => (
          <Select
            value={linkedAppointment ?? NO_APPOINTMENT}
            onValueChange={(value) => {
              setLinkedAppointment(linkable.find((a) => a.id === value)?.id ?? null);
              // La fecha pasa a la de la cita elegida (o a hoy, sin cita).
              setChosenDate(null);
              setDateError(undefined);
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

      {template && (
        <>
          <p className="text-xs text-muted-foreground">
            Completa sólo lo que aplique a esta consulta. Los campos con * son obligatorios.
          </p>
          {hasOdontogram && lastOdontogram && (
            <p className="rounded-lg bg-accent/60 px-3 py-2 text-xs text-accent-foreground">
              El odontograma parte del registrado el {formatNumericDate(lastOdontogram.date)}: actualiza sólo lo que cambió.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            {template.fields.map((field) => (
              <ClinicalFieldInput key={field.id} field={field} values={values} onChange={setValue} error={errors[field.id]} />
            ))}
          </div>
        </>
      )}

      {errors.form && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" role="alert">
          {errors.form}
        </p>
      )}
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Una vez guardada, la evolución no se puede editar ni borrar: para corregir algo, añade una aclaración. La fecha de la consulta sí se puede cambiar después.
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={addNote.isPending} disabled={!template}>
          Guardar evolución
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
