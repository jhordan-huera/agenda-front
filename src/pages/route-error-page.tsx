import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

/** Error inesperado al renderizar una ruta (equivale a error.tsx de otros frameworks). */
export default function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} · ${error.statusText}`
    : "Ocurrió un error inesperado.";

  return (
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
          Recargar
        </Button>
        <Button asChild size="lg">
          <Link to="/">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
