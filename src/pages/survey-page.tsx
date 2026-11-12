import { CircleCheck, LinkIcon, Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Logo } from "@/components/shared/logo";
import { MadeWithAgenda360 } from "@/components/shared/made-with";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAnswerSurvey, usePublicSurvey, useSurveyOptOut } from "@/hooks/queries/use-public-booking";
import { SURVEY_RATING_LABELS } from "@/lib/constants/business";
import { DataError, getErrorMessage } from "@/lib/data";
import { formatLongDate } from "@/lib/format";
import { starsFromParams } from "@/lib/surveys";
import { cn } from "@/lib/utils";

const COMMENT_MAX = 1000;

/** Las 5 estrellas como un grupo de opciones: con el teclado y con su nombre («4 estrellas, Bien»). */
function StarPicker({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <div role="radiogroup" aria-label="¿Cuántas estrellas?" className="flex justify-center gap-1 sm:gap-2">
      {[1, 2, 3, 4, 5].map((stars) => {
        const filled = value !== null && stars <= value;
        return (
          <button
            key={stars}
            type="button"
            role="radio"
            aria-checked={value === stars}
            aria-label={`${stars} ${stars === 1 ? "estrella" : "estrellas"}, ${SURVEY_RATING_LABELS[stars]}`}
            onClick={() => onChange(stars)}
            className="rounded-lg p-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Star className={cn("size-10 sm:size-11", filled ? "fill-primary text-primary" : "text-muted-foreground/50")} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/** Las estrellas que ya dio, quietas. */
function StarsShown({ rating }: { rating: number }) {
  return (
    <p className="flex justify-center gap-1" aria-label={`${rating} ${rating === 1 ? "estrella" : "estrellas"}`}>
      {[1, 2, 3, 4, 5].map((stars) => (
        <Star key={stars} className={cn("size-7", stars <= rating ? "fill-primary text-primary" : "text-muted-foreground/40")} aria-hidden />
      ))}
    </p>
  );
}

/**
 * «¿Cómo te fue?» (/encuesta/:token, spec 048), desde el email del día siguiente a la cita, sin iniciar sesión.
 * La estrella que tocó en el email ya viene elegida (`?estrellas=N`); responde una vez y el enlace cierra a los 14
 * días. `?no-recibir=1` (el enlace del email) muestra primero «No quiero recibir estas encuestas».
 */
export default function SurveyPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const query = usePublicSurvey(token);
  const answer = useAnswerSurvey(token);
  const optOut = useSurveyOptOut(token);
  const [rating, setRating] = useState<number | null>(() => starsFromParams(searchParams));
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showOptOut, setShowOptOut] = useState(searchParams.get("no-recibir") === "1");
  const survey = query.data;

  if (query.isPending) {
    return (
      <div className="min-h-screen bg-muted p-4 dark:bg-canvas" role="status" aria-label="Cargando">
        <div className="mx-auto grid max-w-xl gap-4 py-8">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!survey) {
    const notFound = query.error instanceof DataError && query.error.code === "not_found";
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
          <PageTitle title={notFound ? "Enlace no disponible" : "Encuesta"} />
          <Logo />
          {notFound ? (
            <EmptyState icon={LinkIcon} className="w-full max-w-md" title="Este enlace no está disponible" description="Revisa que el enlace esté completo." />
          ) : (
            <ErrorState className="w-full max-w-md" onRetry={() => query.refetch()} />
          )}
        </div>
        <MadeWithAgenda360 />
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (rating === null) {
      setError("Elige de 1 a 5 estrellas.");
      return;
    }
    try {
      await answer.mutateAsync({ rating, comment });
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  const optOutCard = optOut.isSuccess ? (
    <p role="status" className="rounded-2xl border bg-background p-5 text-sm">
      Listo, {survey.businessName} no te enviará más encuestas.
    </p>
  ) : showOptOut ? (
    <section aria-labelledby="opt-out-title" className="space-y-3 rounded-2xl border bg-background p-5">
      <h2 id="opt-out-title" className="font-bold">
        ¿No quieres recibir más encuestas?
      </h2>
      <p className="text-sm text-muted-foreground">
        {survey.businessName} no te volverá a preguntar cómo te fue. Tus citas y sus avisos siguen igual.
      </p>
      <Button variant="outline" disabled={optOut.isPending} onClick={() => optOut.mutate()}>
        No quiero recibir estas encuestas
      </Button>
      {optOut.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {getErrorMessage(optOut.error)}
        </p>
      )}
    </section>
  ) : (
    <button
      type="button"
      onClick={() => setShowOptOut(true)}
      className="justify-self-center rounded text-xs text-muted-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      No quiero recibir estas encuestas
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted dark:bg-canvas">
      <PageTitle title={`¿Cómo te fue? · ${survey.businessName}`} />
      <header className="border-b bg-background">
        <div className="mx-auto max-w-xl px-4 py-6">
          <p className="truncate text-sm text-muted-foreground">{survey.businessName}</p>
          <h1 className="text-2xl leading-tight font-extrabold tracking-[-0.02em]">¿Cómo te fue, {survey.firstName}?</h1>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-4 px-4 py-6">
        {survey.status === "answered" ? (
          <div role="status" className="space-y-3 rounded-2xl border border-primary/30 bg-accent p-6 text-center text-ink">
            <CircleCheck className="mx-auto size-8" aria-hidden />
            <p className="text-lg leading-snug font-bold">{answer.isSuccess ? "Gracias por contarnos" : "Ya respondiste esta encuesta"}</p>
            {survey.rating !== null && <StarsShown rating={survey.rating} />}
            <p className="text-sm">Tu opinión le llega a {survey.businessName}. ¡Gracias por tu tiempo!</p>
          </div>
        ) : survey.status === "expired" ? (
          <div role="status" className="rounded-2xl border bg-background p-6 text-center">
            <p className="text-lg font-bold">Esta encuesta ya cerró</p>
            <p className="mt-1 text-sm text-muted-foreground">Pasaron más de 14 días desde que te la enviamos. ¡Gracias de todos modos!</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border bg-background p-5 sm:p-6">
            <p className="text-center text-sm text-muted-foreground">
              Tu cita de <span className="font-medium text-foreground">{survey.serviceName}</span> con {survey.professionalName}, el{" "}
              {formatLongDate(survey.date)}.
            </p>
            <StarPicker value={rating} onChange={setRating} />
            <p className="h-5 text-center text-sm font-medium" aria-live="polite">
              {rating !== null ? SURVEY_RATING_LABELS[rating] : ""}
            </p>
            <div className="grid gap-2">
              <Label htmlFor="survey-comment">
                ¿Algo que quieras contarnos? <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="survey-comment"
                rows={4}
                maxLength={COMMENT_MAX}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                aria-describedby="survey-comment-count"
              />
              <p id="survey-comment-count" className="text-right text-xs text-muted-foreground">
                {comment.length} de {COMMENT_MAX}
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={answer.isPending}>
              {answer.isPending ? "Enviando…" : "Enviar"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Tu respuesta la lee {survey.businessName}, con tu nombre. No se publica en ningún lado.
            </p>
          </form>
        )}
        {optOutCard}
        <p className="text-center text-xs text-muted-foreground">Este enlace es sólo para ti: no lo compartas con otras personas.</p>
      </main>
      <MadeWithAgenda360 />
    </div>
  );
}
