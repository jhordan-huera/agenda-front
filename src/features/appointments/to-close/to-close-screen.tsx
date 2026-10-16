import { ClipboardCheck, LogOut } from "lucide-react";
import { useSignOut } from "@/components/layout/use-sign-out";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { CLOSE_LATER_HOURS } from "@/lib/constants/appointment-status";
import { ToCloseList } from "./to-close-list";

/**
 * «Antes de seguir, cierra tus citas pendientes» (spec 018): la ve, en lugar del panel, quien entra con
 * citas sin cerrar de días anteriores (el rol Profesional, las de su agenda; el resto del equipo, las del
 * negocio). Se sale cerrándolas o con «Más tarde», que dura 4 horas en ese aparato. Nunca en modo soporte.
 */
export function ToCloseScreen({ overdue, onLater }: { overdue: number; onLater: () => void }) {
  const signOut = useSignOut();
  const what =
    overdue === 1
      ? "1 cita de un día anterior que sigue pendiente o confirmada"
      : `${overdue} citas de días anteriores que siguen pendientes o confirmadas`;
  return (
    <div className="min-h-screen bg-canvas px-4 py-5 sm:px-6 sm:py-8">
      <PageTitle title="Cierra tus citas pendientes" />
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Logo href="/dashboard" />
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={signOut}>
            <LogOut /> Cerrar sesión
          </Button>
        </div>
        <main className="rounded-2xl border bg-background p-4 shadow-[0_8px_30px_-16px_rgb(16_24_40/0.18)] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-highlight text-lilac-ink">
              <ClipboardCheck className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-balance">Antes de seguir, cierra tus citas pendientes</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Tienes {what}. Marca cómo terminó cada una: así la agenda y los reportes quedan bien.
              </p>
            </div>
          </div>
          <ToCloseList className="mt-5" />
          <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Con «Más tarde» entras al panel; esta pantalla vuelve a salir en {CLOSE_LATER_HOURS} horas si quedan sin cerrar.
            </p>
            <Button variant="outline" className="shrink-0" onClick={onLater}>
              Más tarde
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
