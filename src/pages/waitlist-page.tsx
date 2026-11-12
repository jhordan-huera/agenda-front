import { CalendarSearch, LinkIcon, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Logo } from "@/components/shared/logo";
import { MadeWithAgenda360 } from "@/components/shared/made-with";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaveWaitlist, usePublicWaitlist } from "@/hooks/queries/use-public-booking";
import { describeDayParts, describeWaitlistDays } from "@/lib/constants/business";
import { DataError, getErrorMessage } from "@/lib/data";
import { capitalize, formatLongDate } from "@/lib/format";

/**
 * El enlace personal de quien espera (/lista-de-espera/:token, spec 047), desde sus emails: lo que pidió y «Salir
 * de la lista», sin iniciar sesión. Como «Tu cita», no se guarda en caché ni en los buscadores.
 */
export default function WaitlistPage() {
  const { token = "" } = useParams<{ token: string }>();
  const query = usePublicWaitlist(token);
  const leave = useLeaveWaitlist(token);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entry = query.data;

  if (query.isPending) {
    return (
      <div className="min-h-screen bg-muted p-4 dark:bg-canvas" role="status" aria-label="Cargando">
        <div className="mx-auto grid max-w-xl gap-4 py-8">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!entry) {
    const notFound = query.error instanceof DataError && query.error.code === "not_found";
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
          <PageTitle title={notFound ? "Enlace no disponible" : "Lista de espera"} />
          <Logo />
          {notFound ? (
            <EmptyState
              icon={LinkIcon}
              className="w-full max-w-md"
              title="Este enlace no está disponible"
              description="Revisa que el enlace esté completo. Si saliste de la lista hace más de 30 días, el enlace ya no existe."
            />
          ) : (
            <ErrorState className="w-full max-w-md" onRetry={() => query.refetch()} />
          )}
        </div>
        <MadeWithAgenda360 />
      </div>
    );
  }

  const rows = [
    { label: "Servicio", value: entry.serviceName },
    { label: "Con", value: entry.professionalName ?? "Cualquier profesional" },
    { label: "Días", value: describeWaitlistDays(entry.days) },
    { label: "Horario", value: describeDayParts(entry.dayParts) },
    { label: "Hasta", value: capitalize(formatLongDate(entry.until)) },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted dark:bg-canvas">
      <PageTitle title={`Lista de espera · ${entry.businessName}`} />
      <header className="border-b bg-background">
        <div className="mx-auto max-w-xl px-4 py-6">
          <p className="truncate text-sm text-muted-foreground">{entry.businessName}</p>
          <h1 className="text-2xl leading-tight font-extrabold tracking-[-0.02em]">Tu lista de espera</h1>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-4 px-4 py-6">
        <div role="status" aria-live="polite">
          {entry.closed ? (
            <div className="rounded-2xl border border-primary/30 bg-accent p-5 text-ink">
              <p className="text-lg leading-snug font-bold">Ya no estás en la lista de espera.</p>
              <p className="mt-1 text-sm">No te enviaremos más avisos de horas libres. Puedes elegir otra hora cuando quieras.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Te avisaremos por email si se libera una hora con lo que pediste. Se la queda la primera persona que reserva.
            </p>
          )}
        </div>

        <section aria-labelledby="waitlist-request" className="rounded-2xl border bg-background p-5">
          <h2 id="waitlist-request" className="text-base font-bold">
            Lo que pediste
          </h2>
          <dl className="mt-3 grid gap-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[6rem_1fr] gap-3">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link to={`/book/${entry.businessSlug}`}>
              <CalendarSearch /> Ver las horas libres
            </Link>
          </Button>
          {!entry.closed && (
            <Button size="lg" variant="outline" onClick={() => setConfirming(true)}>
              <LogOut /> Salir de la lista
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">Este enlace es sólo para ti: no lo compartas con otras personas.</p>
      </main>
      <MadeWithAgenda360 slug={entry.businessSlug} />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Salir de la lista de espera?"
        description="Ya no te avisaremos cuando se libere una hora. Si cambias de idea, puedes anotarte otra vez desde la página de reservas."
        confirmLabel="Salir de la lista"
        onConfirm={async () => {
          setError(null);
          try {
            await leave.mutateAsync();
          } catch (caught) {
            setError(getErrorMessage(caught));
            throw caught;
          }
        }}
      />
    </div>
  );
}
