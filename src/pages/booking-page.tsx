import { CalendarX2, SearchX } from "lucide-react";
import { Link, useParams } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingFlow } from "@/features/booking/booking-flow";
import { BookingHeader } from "@/features/booking/booking-header";
import { usePublicProfile } from "@/hooks/queries/use-public-booking";
import { APP_NAME } from "@/lib/constants/app";

/** Página pública de reservas: /book/:username (sin sesión ni panel). */
export default function BookingPage() {
  const { username = "" } = useParams<{ username: string }>();
  const profileQuery = usePublicProfile(username);

  if (profileQuery.isPending) {
    return (
      <div className="min-h-screen bg-muted/40" role="status" aria-label="Cargando">
        <div className="border-b bg-background">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-8">
            <Skeleton className="size-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ErrorState className="w-full max-w-md" onRetry={() => profileQuery.refetch()} />
      </div>
    );
  }

  const profile = profileQuery.data;
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <PageTitle title="Página no encontrada" />
        <Logo />
        <EmptyState
          icon={SearchX}
          className="w-full max-w-md"
          title="No encontramos esta página de reservas"
          description="Revisa que el enlace sea correcto o contacta con el profesional."
          action={
            <Button asChild variant="outline">
              <Link to="/">Ir al inicio</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <PageTitle title={`Reservar con ${profile.business.name}`} />
      <BookingHeader business={profile.business} professional={profile.professional} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        {profile.services.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="Este negocio aún no tiene servicios disponibles"
            description="Vuelve a intentarlo más tarde."
          />
        ) : (
          <BookingFlow slug={username} profile={profile} />
        )}
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Reservas gestionadas con{" "}
        <Link to="/" className="font-medium text-foreground hover:underline">
          {APP_NAME}
        </Link>
        {" · "}
        <a href="/privacidad" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
          Privacidad
        </a>
      </footer>
    </div>
  );
}
