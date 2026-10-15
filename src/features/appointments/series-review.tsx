import { AlertTriangle, Ban, CalendarX2, Check, Clock, Loader2, Undo2, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyPlanLimit, SERIES_OVERRIDABLE, SERIES_RETIMABLE, seriesFrequencyText, seriesRowCreates } from "@/lib/appointment-series";
import { formatTimeRange, plural } from "@/lib/format";
import { addMinutesToTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AppointmentSeriesFrequency, AppointmentSeriesPreview, ISODate, SeriesDateStatus, TimeString } from "@/types";
import { seriesDayLabel } from "./appointment-utils";

/** Lo que se eligió en cada fila: su hora (la de la serie u otra libre), si se quitó y «Agendar igual». */
interface RowChoice {
  time: TimeString;
  removed: boolean;
  allowAnyway: boolean;
}

/** Lo que se envía al crear y lo que no se crea (para el aviso del final). */
export interface SeriesReviewResult {
  dates: { date: ISODate; startTime: TimeString; allowOutsideHours: boolean }[];
  /** Las que quedaron fuera de la lista: quitadas o marcadas sin «Agendar igual». */
  left: { date: ISODate; startTime: TimeString }[];
}

/** La marca de cada fila: siempre con su texto (no sólo el color) y los colores del tema. */
const MARKS: Record<SeriesDateStatus | "anyway" | "removed", { label: string; icon: typeof Check; className: string }> = {
  free: { label: "Se crea", icon: Check, className: "bg-highlight/60 text-ink" },
  anyway: { label: "Se agenda igual", icon: Check, className: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20" },
  busy: { label: "Ocupada", icon: Ban, className: "bg-destructive/10 text-destructive" },
  blocked: { label: "Bloqueada", icon: CalendarX2, className: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20" },
  day_off: { label: "No atiende", icon: CalendarX2, className: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20" },
  outside_hours: { label: "Fuera de horario", icon: Clock, className: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20" },
  plan_limit: { label: "Supera el cupo", icon: AlertTriangle, className: "bg-destructive/10 text-destructive" },
  removed: { label: "Quitada", icon: X, className: "bg-muted text-muted-foreground" },
};

function Mark({ kind }: { kind: keyof typeof MARKS }) {
  const { label, icon: Icon, className } = MARKS[kind];
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap", className)}>
      <Icon className="size-3.5" aria-hidden /> {label}
    </span>
  );
}

/**
 * La lista de fechas de la serie, antes de crearla (spec 011, R13): reemplaza al formulario en el mismo
 * diálogo. Cada fecha con su día, su hora y su marca. En las que chocan se cambia la hora (las libres de
 * ese día), se agenda igual (un bloqueo, un día sin atención o fuera del horario: desmarcada al empezar,
 * decisión del dueño del producto) o se quitan. El cupo del plan se recalcula al momento: al quitar una
 * fecha, la marca pasa a la siguiente.
 */
export function SeriesReview({
  preview,
  frequency,
  durationMinutes,
  creating,
  onBack,
  onCreate,
}: {
  preview: AppointmentSeriesPreview;
  frequency: AppointmentSeriesFrequency;
  durationMinutes: number;
  creating: boolean;
  onBack: () => void;
  onCreate: (result: SeriesReviewResult) => void;
}) {
  const [choices, setChoices] = useState<RowChoice[]>(() =>
    preview.dates.map((row) => ({ time: row.startTime, removed: false, allowAnyway: false })),
  );
  const choose = (index: number, patch: Partial<RowChoice>) =>
    setChoices((current) => current.map((choice, i) => (i === index ? { ...choice, ...patch } : choice)));
  const withYear = new Set(preview.dates.map((row) => row.date.slice(0, 4))).size > 1;
  const first = preview.dates[0];

  // La marca de cada fila con lo elegido: otra hora libre es libre; el cupo, al final y sólo en las que se crean.
  const rows = preview.dates.map((row, index) => {
    const choice = choices[index];
    const base = (row.status === "plan_limit" ? "free" : row.status) as SeriesDateStatus;
    const retimed = choice.time !== row.startTime;
    // Antes del cupo: la marca de la agenda (el cupo la puede cambiar a «Supera el cupo»).
    const status = (retimed ? "free" : base) as SeriesDateStatus;
    return {
      ...row,
      index,
      choice,
      base,
      retimed,
      status,
      reason: status === "free" ? null : row.reason,
      allowAnyway: choice.allowAnyway && !retimed,
      endTime: addMinutesToTime(choice.time, durationMinutes),
    };
  });
  const planned = new Map(
    applyPlanLimit(
      rows.filter((row) => !row.choice.removed),
      preview.planRemaining,
      preview.monthlyLimit,
    ).map((row) => [row.index, row]),
  );
  const final = rows.map((row) => planned.get(row.index) ?? row);
  const creates = (row: (typeof final)[number]) => !row.choice.removed && seriesRowCreates(row);
  const toCreate = final.filter(creates);
  const left = final.filter((row) => !creates(row));

  const create = () =>
    onCreate({
      dates: toCreate.map((row) => ({ date: row.date, startTime: row.choice.time, allowOutsideHours: row.allowAnyway })),
      left: left.map((row) => ({ date: row.date, startTime: row.choice.time })),
    });

  return (
    <div className="grid gap-4">
      <div className="rounded-lg bg-muted/60 p-3 text-sm">
        <p className="font-medium">
          {plural(preview.dates.length, "fecha", "fechas")} · {seriesFrequencyText(frequency)} ·{" "}
          {first ? formatTimeRange(first.startTime, first.endTime) : ""}
        </p>
        <p className="text-muted-foreground" aria-live="polite">
          {toCreate.length === preview.dates.length
            ? "Todas se pueden crear."
            : `Se crean ${toCreate.length} de ${preview.dates.length}: revisa las marcadas.`}
        </p>
        {preview.monthlyLimit !== null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Tu plan incluye {preview.monthlyLimit} citas al mes: las que pasan el cupo no se crean.
          </p>
        )}
      </div>

      <ol aria-label="Fechas de la serie" className="grid gap-2">
        {final.map((row) => {
          const dayLabel = seriesDayLabel(row.date, withYear).toLowerCase();
          const retimable = !row.choice.removed && SERIES_RETIMABLE.has(row.base);
          const overridable = !row.choice.removed && !row.retimed && SERIES_OVERRIDABLE.has(row.base);
          return (
            <SeriesRow
              key={row.date}
              number={row.index + 1}
              label={seriesDayLabel(row.date, withYear)}
              time={formatTimeRange(row.choice.time, row.endTime)}
              mark={row.choice.removed ? "removed" : row.status !== "plan_limit" && row.allowAnyway && SERIES_OVERRIDABLE.has(row.status) ? "anyway" : row.status}
              reason={row.choice.removed ? null : row.reason}
              retimed={row.retimed ? row.startTime : null}
              toggle={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => choose(row.index, { removed: !row.choice.removed })}
                  aria-label={`${row.choice.removed ? "Volver a agregar" : "Quitar"} el ${dayLabel}`}
                >
                  {row.choice.removed ? (
                    <>
                      <Undo2 /> Volver a agregar
                    </>
                  ) : (
                    <>
                      <X /> Quitar
                    </>
                  )}
                </Button>
              }
            >
              {retimable && (
                <RetimeSelect
                  dayLabel={dayLabel}
                  original={row.startTime}
                  value={row.choice.time}
                  freeTimes={row.freeTimes}
                  onChange={(time) => choose(row.index, { time })}
                />
              )}
              {overridable && (
                <AnywayCheckbox dayLabel={dayLabel} checked={row.choice.allowAnyway} onChange={(allowAnyway) => choose(row.index, { allowAnyway })} />
              )}
            </SeriesRow>
          );
        })}
      </ol>

      {toCreate.length < 2 && (
        <p role="status" className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {toCreate.length === 1
            ? "Para una sola cita, quita «Repetir»."
            : "Ninguna fecha se puede crear: cambia la hora de alguna o vuelve atrás."}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack} disabled={creating}>
          Volver
        </Button>
        <Button type="button" onClick={create} disabled={creating || toCreate.length < 2} aria-busy={creating}>
          {creating && <Loader2 className="animate-spin" aria-hidden />}
          {toCreate.length === 0 ? "Crear citas" : `Crear ${plural(toCreate.length, "cita", "citas")}`}
        </Button>
      </DialogFooter>
    </div>
  );
}

function SeriesRow({
  number,
  label,
  time,
  mark,
  reason,
  retimed,
  toggle,
  children,
}: {
  number: number;
  label: string;
  time: string;
  mark: keyof typeof MARKS;
  reason: string | null;
  /** La hora de la serie, si se le eligió otra. */
  retimed: string | null;
  /** «Quitar» o «Volver a agregar». */
  toggle: ReactNode;
  /** «Otra hora» y «Agendar igual», si los tiene. */
  children: ReactNode;
}) {
  const controls = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <li className={cn("grid gap-2 rounded-lg border px-3 py-2.5", mark === "removed" && "bg-muted/40")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="min-w-0 flex-1 basis-44">
          <p className={cn("text-sm font-medium", mark === "removed" && "text-muted-foreground line-through")}>
            <span className="text-muted-foreground">{number}.</span> {label}
          </p>
          <p className="text-sm text-muted-foreground">
            {time}
            {retimed && <span> · antes a las {retimed}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Mark kind={mark} />
          {toggle}
        </div>
      </div>
      {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
      {controls && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{children}</div>}
    </li>
  );
}

/** «Otra hora»: las horas libres de ese día en la cuadrícula del negocio (y la de la serie, para volver). */
function RetimeSelect({
  dayLabel,
  original,
  value,
  freeTimes,
  onChange,
}: {
  dayLabel: string;
  original: TimeString;
  value: TimeString;
  freeTimes: TimeString[];
  onChange: (time: TimeString) => void;
}) {
  const id = useId();
  if (freeTimes.length === 0) {
    return <p className="text-xs text-muted-foreground">Ese día no quedan horas libres.</p>;
  }
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-xs font-medium">
        Otra hora<span className="sr-only"> para el {dayLabel}</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} size="sm" className="w-28">
          <SelectValue>{value}</SelectValue>
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={original}>{original} (de la serie)</SelectItem>
          {freeTimes.map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** «Agendar igual» en un bloqueo, un día que no atiende o fuera del horario (como hoy una cita suelta). */
function AnywayCheckbox({ dayLabel, checked, onChange }: { dayLabel: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(next) => onChange(next === true)} />
      <Label htmlFor={id} className="text-xs font-medium">
        Agendar igual<span className="sr-only"> el {dayLabel}</span>
      </Label>
    </div>
  );
}
