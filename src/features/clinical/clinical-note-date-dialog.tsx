import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useChangeClinicalNoteDate } from "@/hooks/queries/use-clinical";
import { getErrorMessage } from "@/lib/data";
import { formatDateTime, formatNumericDate, toZonedDate } from "@/lib/format";
import { clinicalNoteDateRange } from "@/lib/validations/clinical";
import type { ClinicalNote } from "@/types";

interface ClinicalNoteDateDialogProps {
  note: ClinicalNote;
  timezone?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Corregir la fecha de la consulta (spec 037): entre los 30 días anteriores al día en que se registró
 * y ese día. El contenido no cambia y el cambio queda en la actividad.
 */
export function ClinicalNoteDateDialog({ note, timezone, open, onOpenChange }: ClinicalNoteDateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <DateForm note={note} timezone={timezone} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function DateForm({ note, timezone, onDone }: { note: ClinicalNote; timezone?: string; onDone: () => void }) {
  const changeDate = useChangeClinicalNoteDate(note.clientId);
  const range = clinicalNoteDateRange(toZonedDate(note.createdAt, timezone));
  const [date, setDate] = useState(note.date);
  const error =
    date && (date < range.min || date > range.max)
      ? `Elige un día del ${formatNumericDate(range.min)} al ${formatNumericDate(range.max)}.`
      : undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await changeDate.mutateAsync({ noteId: note.id, input: { date } });
      toast.success(`La evolución quedó con fecha ${formatNumericDate(date)}`);
      onDone();
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Cambiar la fecha de la consulta</DialogTitle>
        <DialogDescription>
          Puede llevar la fecha del día en que se registró ({formatDateTime(note.createdAt, timezone)}) o de hasta 30 días
          antes. El contenido no cambia y el cambio queda en la actividad.
        </DialogDescription>
      </DialogHeader>
      <FormField label="Fecha de la consulta" error={error}>
        {(field) => (
          <Input {...field} type="date" min={range.min} max={range.max} value={date} onChange={(e) => setDate(e.target.value)} />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={changeDate.isPending} disabled={!date || date === note.date || Boolean(error)}>
          Guardar fecha
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
