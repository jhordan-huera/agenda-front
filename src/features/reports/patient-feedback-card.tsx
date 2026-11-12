import { MessageSquareText, Star } from "lucide-react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurveySummary } from "@/hooks/queries/use-surveys";
import { formatShortDate, plural } from "@/lib/format";
import { formatAverage, ratingBars } from "@/lib/surveys";
import type { SurveyResponse } from "@/types";

/** Una respuesta: el paciente, la fecha y las estrellas, y su comentario si dejó uno. */
function ResponseRow({ response, showClient }: { response: SurveyResponse; showClient: boolean }) {
  return (
    <li className="space-y-1 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 text-sm">
          {showClient ? (
            <Link to={`/dashboard/clients/${response.clientId}`} className="font-medium hover:underline">
              {response.clientName}
            </Link>
          ) : (
            <span className="font-medium">{response.serviceName}</span>
          )}
          <span className="text-muted-foreground">
            {" "}
            · {formatShortDate(response.appointmentDate)} · {response.professionalName}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums" aria-label={plural(response.rating, "estrella", "estrellas")}>
          <Star className="size-3.5 fill-primary text-primary" aria-hidden /> {response.rating}
        </span>
      </div>
      {response.comment && <p className="text-sm text-muted-foreground">«{response.comment}»</p>}
    </li>
  );
}

/**
 * «Opiniones de los pacientes» (spec 048): el promedio, cuántas respondieron, una barra por estrella y las últimas
 * respuestas del periodo y el profesional elegidos (o de un paciente, en su ficha). Privadas: sólo para quien ve
 * Reportes; el rol Profesional, sólo las de su agenda (lo filtra la API). `hideWhenEmpty`: en la ficha, no sale si
 * el paciente no respondió ninguna.
 */
export function PatientFeedbackCard({
  from,
  to,
  professionalId,
  clientId,
  hideWhenEmpty = false,
}: {
  from?: string;
  to?: string;
  professionalId?: string;
  clientId?: string;
  hideWhenEmpty?: boolean;
}) {
  const query = useSurveySummary({ from, to, professionalId, clientId });
  const summary = query.data;
  if (hideWhenEmpty && (!summary || summary.count === 0)) return null;
  const forClient = Boolean(clientId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{forClient ? "Sus opiniones" : "Opiniones de los pacientes"}</CardTitle>
        <CardDescription>
          {forClient ? "Lo que respondió en la encuesta después de sus citas." : "Lo que respondieron en la encuesta después de su cita. Sólo las ve tu equipo."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : !summary || summary.count === 0 ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <MessageSquareText className="size-4" aria-hidden /> Todavía no hay opiniones en este periodo.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-[minmax(0,12rem)_1fr]">
            <div className="space-y-3">
              <p>
                <span className="text-4xl leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
                  {formatAverage(summary.average ?? 0)}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">de 5</span>
              </p>
              <p className="text-sm text-muted-foreground">De {plural(summary.count, "respuesta", "respuestas")}</p>
              {!forClient && (
                <ul className="space-y-1.5" aria-label="Respuestas por estrellas">
                  {ratingBars(summary.byRating).map((bar) => (
                    <li key={bar.stars} className="grid grid-cols-[1.5rem_1fr_1.75rem] items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-0.5 tabular-nums" aria-label={plural(bar.stars, "estrella", "estrellas")}>
                        {bar.stars}
                        <Star className="size-3 fill-current text-muted-foreground" aria-hidden />
                      </span>
                      <span className="h-2 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${bar.percent}%` }} />
                      </span>
                      <span className="text-right text-muted-foreground tabular-nums">{bar.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ul className="divide-y" aria-label={forClient ? "Sus respuestas" : "Las últimas respuestas"}>
              {summary.responses.slice(0, forClient ? 10 : 8).map((response) => (
                <ResponseRow key={response.id} response={response} showClient={!forClient} />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
