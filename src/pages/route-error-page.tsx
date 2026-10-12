import { useEffect } from "react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/app";
import { isStaleAssetError, publishedVersion, reloadForNewVersion, runningVersion } from "@/lib/new-version";

/**
 * Detalle del error para soporte, sin datos de nadie: el tipo, el mensaje y el archivo de la app
 * donde ocurrió ("dashboard-page-AbC123.js:1:2345"), con la versión que corre en la pestaña.
 */
function describeError(error: unknown): string | null {
  if (isRouteErrorResponse(error)) return null;
  const text = error instanceof Error ? `${error.name}: ${error.message}` : typeof error === "string" ? error : null;
  if (!text) return null;
  const where = error instanceof Error ? error.stack?.match(/\/assets\/([\w.-]+\.js:\d+:\d+)/)?.[1] : undefined;
  const version = runningVersion();
  return [text.slice(0, 240), where && `en ${where}`, version && `versión ${version}`].filter(Boolean).join(" · ");
}

/** Error inesperado al renderizar una ruta (equivale a error.tsx de otros frameworks). */
export default function RouteErrorPage() {
  const error = useRouteError();
  const stale = isStaleAssetError(error);
  const message = isRouteErrorResponse(error)
    ? `${error.status} · ${error.statusText}`
    : stale
      ? `Hay una versión nueva de ${APP_NAME}. Recarga la página para continuar.`
      : "Ocurrió un error inesperado.";
  const detail = stale ? null : describeError(error);

  // Justo después de publicar, una pestaña con la versión anterior puede fallar al mezclarse con la
  // nueva (otra forma de los datos de la API, otra pieza de la app): si ya hay otra versión
  // publicada, se recarga sola una vez para traerla.
  useEffect(() => {
    if (isRouteErrorResponse(error) || stale) return;
    const running = runningVersion();
    if (!running) return;
    let cancelled = false;
    void publishedVersion().then((published) => {
      if (!cancelled && published && published !== running) reloadForNewVersion();
    });
    return () => {
      cancelled = true;
    };
  }, [error, stale]);

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
      {detail && (
        <p className="max-w-md font-mono text-[11px] leading-relaxed break-words text-muted-foreground/80">
          Detalle para soporte: {detail}
        </p>
      )}
    </div>
  );
}
