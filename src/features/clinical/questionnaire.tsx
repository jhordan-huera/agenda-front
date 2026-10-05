import { AlertTriangle } from "lucide-react";
import { questionnaireScore } from "@/lib/validations/clinical";
import { cn } from "@/lib/utils";
import type { ClinicalField } from "@/types";

type QuestionnaireField = Extract<ClinicalField, { type: "questionnaire" }>;

function ScoreSummary({ field, answers }: { field: QuestionnaireField; answers: number[] }) {
  const { total, max, label, alerts } = questionnaireScore(field, answers);
  return (
    <div className="grid gap-1.5">
      <p className="text-sm">
        <span className="font-semibold tabular-nums">
          {total}/{max}
        </span>
        {label && <span className="text-muted-foreground"> · {label}</span>}
      </p>
      {alerts.map((alert) => (
        <p key={alert} className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {alert}
        </p>
      ))}
    </div>
  );
}

/** Resultado de un cuestionario (ficha e impresión), con las respuestas desplegables en pantalla. */
export function QuestionnaireView({ field, answers }: { field: QuestionnaireField; answers: number[] }) {
  const optionLabel = (points: number) => field.options.find((option) => option.points === points)?.label ?? String(points);
  return (
    <div className="grid gap-1">
      <ScoreSummary field={field} answers={answers} />
      <details className="text-xs print:hidden">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver respuestas</summary>
        <ol className="mt-1 grid list-decimal gap-0.5 pl-5">
          {field.items.map((item, index) => (
            <li key={index}>
              {item} — <span className="font-medium">{optionLabel(answers[index])}</span> ({answers[index]})
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

/** Cuestionario editable: una fila por pregunta con sus respuestas; el total se calcula al momento. */
export function QuestionnaireInput({
  field,
  value,
  onChange,
}: {
  field: QuestionnaireField;
  value: (number | null)[];
  onChange: (value: (number | null)[]) => void;
}) {
  const answers = field.items.map((_, index) => value[index] ?? null);
  const answered = answers.filter((points) => points !== null) as number[];
  return (
    <div className="grid gap-3">
      {field.prompt && <p className="text-xs text-muted-foreground">{field.prompt}</p>}
      <ol className="grid gap-2.5">
        {field.items.map((item, index) => (
          <li key={index} className="grid gap-1.5 border-b pb-2.5 last:border-0">
            <p className="text-sm">
              <span className="text-muted-foreground">{index + 1}.</span> {item}
            </p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Pregunta ${index + 1}`}>
              {field.options.map((option) => {
                const selected = answers[index] === option.points;
                return (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange(answers.map((points, i) => (i === index ? (selected ? null : option.points) : points)))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs",
                      selected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                    )}
                  >
                    {option.label} <span className="opacity-70">({option.points})</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      <div className="rounded-lg bg-muted/50 px-3 py-2" aria-live="polite">
        <p className="text-xs text-muted-foreground">
          Respondidas {answered.length} de {field.items.length}
        </p>
        {answered.length === field.items.length && <ScoreSummary field={field} answers={answered} />}
      </div>
    </div>
  );
}
