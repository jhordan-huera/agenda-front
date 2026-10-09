import { useState } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSaveSchedules } from "@/hooks/queries/use-schedule";
import { getErrorMessage } from "@/lib/data";
import type { Schedule } from "@/types";
import { toWeekInputs, validateWeek, weekKey } from "./schedule-utils";
import { WeeklyScheduleEditor } from "./weekly-schedule-editor";

interface WeeklyScheduleCardProps {
  professionalId: string;
  /** Su nombre, si el negocio tiene varias agendas. */
  professionalName?: string;
  /** El horario de ese profesional. */
  schedules: Schedule[];
}

/** Horario semanal de una agenda. Al cambiar de profesional, la página lo vuelve a montar (key). */
export function WeeklyScheduleCard({ professionalId, professionalName, schedules }: WeeklyScheduleCardProps) {
  const saveSchedules = useSaveSchedules();
  const saved = toWeekInputs(schedules);
  const [week, setWeek] = useState(saved);
  const [errors, setErrors] = useState<Record<number, string>>({});
  // Comparado sin el orden de las claves ni de los intervalos: la API los devuelve ordenados (y como
  // {end, start}), y "Guardar horario" seguía activo tras guardar un horario partido.
  const dirty = weekKey(week) !== weekKey(saved);

  const save = async () => {
    const validation = validateWeek(week);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      toast.error("Revisa los intervalos marcados");
      return;
    }
    try {
      // Lo que quedó guardado (intervalos en orden), para que el editor lo muestre igual que al volver.
      setWeek(toWeekInputs(await saveSchedules.mutateAsync({ professionalId, days: week })));
      toast.success("Horario guardado");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{professionalName ? `Horario semanal de ${professionalName}` : "Horario semanal"}</CardTitle>
        <CardDescription>
          Activa los días que atiendes. Usa “Agregar intervalo” para horarios partidos (p. ej. 08:00–12:00 y 14:00–18:00).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <WeeklyScheduleEditor value={week} onChange={setWeek} errors={errors} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabled={!dirty || saveSchedules.isPending}
            onClick={() => {
              setWeek(saved);
              setErrors({});
            }}
          >
            Descartar cambios
          </Button>
          <SubmitButton type="button" onClick={save} disabled={!dirty} loading={saveSchedules.isPending}>
            Guardar horario
          </SubmitButton>
        </div>
      </CardContent>
    </Card>
  );
}
