import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALL_AGENDAS, ProfessionalSelect } from "@/features/professionals/professional-select";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useCreateBlockedTime } from "@/hooks/queries/use-schedule";
import { useBusinessNow } from "@/hooks/use-business-now";
import { getErrorMessage } from "@/lib/data";
import { blockedTimeSchema, type BlockedTimeInput } from "@/lib/validations/schedule";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { ISODate } from "@/types";

interface BlockedTimeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: ISODate;
  /** Agenda propuesta (con varias, se puede cambiar o elegir todo el negocio). */
  defaultProfessionalId?: string | null;
}

export function BlockedTimeFormDialog({ open, onOpenChange, defaultDate, defaultProfessionalId }: BlockedTimeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bloquear horario</DialogTitle>
          <DialogDescription>
            El tiempo bloqueado no aparecerá como disponible en tu página de reservas.
          </DialogDescription>
        </DialogHeader>
        <BlockedTimeForm
          defaultDate={defaultDate}
          defaultProfessionalId={defaultProfessionalId}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function BlockedTimeForm({
  defaultDate,
  defaultProfessionalId,
  onDone,
}: {
  defaultDate?: ISODate;
  defaultProfessionalId?: string | null;
  onDone: () => void;
}) {
  const { data: business } = useCurrentBusiness();
  const today = useBusinessNow(business?.timezone).date;
  const createBlockedTime = useCreateBlockedTime();
  const agendas = useAgendas();
  // Una sola agenda: el bloqueo es de todo el negocio. El rol Profesional sólo bloquea la suya.
  const fixedProfessionalId = agendas.scoped ? agendas.ownProfessionalId : agendas.multiple ? undefined : null;
  const [values, setValues] = useState<BlockedTimeInput>({
    professionalId: fixedProfessionalId !== undefined ? fixedProfessionalId : (defaultProfessionalId ?? null),
    reason: "",
    allDay: true,
    startDate: defaultDate ?? today,
    endDate: defaultDate ?? today,
    startTime: "14:00",
    endTime: "16:00",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = <K extends keyof BlockedTimeInput>(key: K, value: BlockedTimeInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(blockedTimeSchema, values);
    setErrors(result.errors);
    if (!result.success) return;

    try {
      await createBlockedTime.mutateAsync(result.data);
      toast.success("Horario bloqueado");
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {fixedProfessionalId === undefined && (
        <FormField label="Aplica a" error={errors.professionalId}>
          {(control) => (
            <ProfessionalSelect
              id={control.id}
              professionals={agendas.selectable}
              value={values.professionalId ?? ALL_AGENDAS}
              onValueChange={(value) => set("professionalId", value === ALL_AGENDAS ? null : value)}
              allLabel="Todo el negocio (feriado, cierre)"
            />
          )}
        </FormField>
      )}
      <FormField label="Motivo" error={errors.reason}>
        {(field) => (
          <Input
            {...field}
            autoFocus
            placeholder="Ej.: Vacaciones, trámite personal…"
            value={values.reason}
            onChange={(e) => set("reason", e.target.value)}
          />
        )}
      </FormField>

      <Tabs value={values.allDay ? "days" : "hours"} onValueChange={(tab) => set("allDay", tab === "days")}>
        <TabsList className="w-full">
          <TabsTrigger value="days">Días completos</TabsTrigger>
          <TabsTrigger value="hours">Rango de horas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Desde" error={errors.startDate}>
          {(field) => (
            <Input
              {...field}
              type="date"
              value={values.startDate}
              onChange={(e) => {
                const startDate = e.target.value;
                setValues((current) => ({
                  ...current,
                  startDate,
                  endDate: current.endDate < startDate ? startDate : current.endDate,
                }));
              }}
            />
          )}
        </FormField>
        <FormField label="Hasta" error={errors.endDate}>
          {(field) => (
            <Input
              {...field}
              type="date"
              min={values.startDate}
              value={values.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          )}
        </FormField>
      </div>

      {!values.allDay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Hora inicial" error={errors.startTime}>
            {(field) => (
              <Input
                {...field}
                type="time"
                step={900}
                value={values.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Hora final" error={errors.endTime}>
            {(field) => (
              <Input
                {...field}
                type="time"
                step={900}
                value={values.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            )}
          </FormField>
        </div>
      )}
      {!values.allDay && values.startDate !== values.endDate && (
        <p className="text-xs text-muted-foreground">La franja horaria se bloqueará en cada día del rango.</p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={createBlockedTime.isPending}>Bloquear</SubmitButton>
      </DialogFooter>
    </form>
  );
}
