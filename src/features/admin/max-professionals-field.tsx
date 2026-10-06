import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetMaxProfessionals } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";

interface MaxProfessionalsFieldProps {
  businessId: string;
  /** Agendas contratadas (null: sin tope). */
  value: number | null;
  /** Profesionales activos ahora. */
  active: number;
}

/**
 * Agendas contratadas por un negocio Business (se cobran por profesional). Bajar el número no desactiva a
 * nadie: el negocio sólo no puede sumar ni reactivar profesionales hasta quedar dentro.
 */
export function MaxProfessionalsField({ businessId, value, active }: MaxProfessionalsFieldProps) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const save = useSetMaxProfessionals();
  const parsed = draft.trim() === "" ? null : Number(draft);
  const invalid = parsed !== null && (!Number.isInteger(parsed) || parsed < 1 || parsed > 200);
  const changed = parsed !== value;

  const submit = async () => {
    try {
      await save.mutateAsync({ businessId, maxProfessionals: parsed });
      toast.success(parsed === null ? "Agendas sin tope" : `Agendas contratadas: ${parsed}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="mt-3 grid content-start gap-2 border-t pt-3">
      <Label htmlFor="max-professionals">Agendas contratadas</Label>
      <div className="flex gap-2">
        <Input
          id="max-professionals"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          placeholder="Sin tope"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-invalid={invalid}
          className="w-28"
        />
        <Button type="button" size="sm" variant="outline" disabled={!changed || invalid || save.isPending} onClick={submit}>
          Guardar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {active === 1 ? "1 profesional activo" : `${active} profesionales activos`}. Vacío: sin tope.
      </p>
      {value !== null && active > value && (
        <p className="text-xs font-medium text-amber-700">
          Tiene más agendas activas de las contratadas: no podrá sumar ni reactivar profesionales hasta desactivar las que
          sobran.
        </p>
      )}
    </div>
  );
}
