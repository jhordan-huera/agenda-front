import { CircleCheck, LinkIcon } from "lucide-react";
import { useParams } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Logo } from "@/components/shared/logo";
import { MadeWithAgenda360 } from "@/components/shared/made-with";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useControlReminderOptOut, usePublicControlReminder } from "@/hooks/queries/use-public-booking";
import { DataError, getErrorMessage } from "@/lib/data";

/**
 * «No quiero recibir estos recordatorios» (/recordatorio/:token, spec 051), desde el email «Te toca tu control», sin
 * iniciar sesión. Pide confirmar con un botón: así un programa que revisa los enlaces del email no da de baja al
 * paciente. Sólo dice el negocio: nada del paciente ni de sus citas.
 */
export default function ControlReminderPage() {
  const { token = "" } = useParams<{ token: string }>();
  const query = usePublicControlReminder(token);
  const optOut = useControlReminderOptOut(token);
  const reminder = query.data;

  if (query.isPending) {
    return (
      <div className="min-h-screen bg-muted p-4 dark:bg-canvas" role="status" aria-label="Cargando">
        <div className="mx-auto grid max-w-xl gap-4 py-8">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!reminder) {
    const notFound = query.error instanceof DataError && query.error.code === "not_found";
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
          <PageTitle title={notFound ? "Enlace no disponible" : "Recordatorios de control"} />
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

  const done = reminder.optedOut || optOut.isSuccess;

  return (
    <div className="flex min-h-screen flex-col bg-muted dark:bg-canvas">
      <PageTitle title={`Recordatorios de control · ${reminder.businessName}`} />
      <header className="border-b bg-background">
        <div className="mx-auto max-w-xl px-4 py-6">
          <p className="truncate text-sm text-muted-foreground">{reminder.businessName}</p>
          <h1 className="text-2xl leading-tight font-extrabold tracking-[-0.02em]">Recordatorios de control</h1>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-4 px-4 py-6">
        {done ? (
          <div role="status" className="space-y-3 rounded-2xl border border-primary/30 bg-accent p-6 text-center text-ink">
            <CircleCheck className="mx-auto size-8" aria-hidden />
            <p className="text-lg leading-snug font-bold">Listo, no te enviaremos más recordatorios</p>
            <p className="text-sm">
              {reminder.businessName} ya no te escribirá cuando te toque volver. Tus citas y sus avisos siguen igual.
            </p>
          </div>
        ) : (
          <section aria-labelledby="opt-out-title" className="space-y-4 rounded-2xl border bg-background p-5 sm:p-6">
            <h2 id="opt-out-title" className="text-lg font-bold">
              ¿No quieres recibir más recordatorios de control?
            </h2>
            <p className="text-sm text-muted-foreground">
              {reminder.businessName} te escribe cuando te toca volver a un control. Si prefieres que no lo haga, confírmalo aquí. Tus
              citas y sus avisos siguen igual.
            </p>
            <Button size="lg" disabled={optOut.isPending} onClick={() => optOut.mutate()}>
              No quiero recibir estos recordatorios
            </Button>
            {optOut.isError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {getErrorMessage(optOut.error)}
              </p>
            )}
          </section>
        )}
      </main>
      <MadeWithAgenda360 />
    </div>
  );
}
