import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/features/auth/session-provider";

const MINUTE = 60_000;

/**
 * Cada petición a la API gasta CPU del servidor (Vercel cuenta los minutos), así que al volver a la
 * pestaña o abrir una pantalla se reutiliza lo que se pidió hace poco. Lo que cambia uno mismo se
 * refresca al guardar (las mutaciones invalidan su caché), sin esperar.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 2 * MINUTE, retry: 1 },
    // Sin señal, guardar falla al momento con el error de red ("No se pudo conectar…"). Por defecto
    // la mutación quedaba en pausa y se enviaba sola al volver la red, con el diálogo ya cerrado (y
    // si se volvía a guardar, salía dos veces: evoluciones duplicadas).
    mutations: { networkMode: "always" },
  },
});
// Lo que otros cambian a menudo: las citas (recepción, profesionales, reservas online) y las horas
// libres de la página de reservas.
for (const key of ["appointments", "public-profile"]) queryClient.setQueryDefaults([key], { staleTime: 30_000 });
// La configuración del negocio, que casi no cambia.
for (const key of ["user", "business", "services", "schedules", "blocked-times", "team", "subscription", "platform-settings"]) {
  queryClient.setQueryDefaults([key], { staleTime: 5 * MINUTE });
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
