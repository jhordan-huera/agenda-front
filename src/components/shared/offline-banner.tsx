import { WifiOff } from "lucide-react";
import { useConnectionProblem } from "@/lib/connection-status";

/** Aviso fijo mientras no hay conexión: la app abre, pero los datos vienen siempre de la API. */
export function OfflineBanner() {
  const problem = useConnectionProblem();
  if (!problem) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-2.5 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg print:hidden"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>
        {problem === "offline"
          ? "Sin conexión a internet. No se puede ver ni guardar nada nuevo hasta que vuelva."
          : "No se pudo conectar con el servidor. Reintentando…"}
      </span>
    </div>
  );
}
