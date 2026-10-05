import { Download, Share, SquarePlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useInstallApp } from "./install-prompt";

/** Instala (Chrome, Edge) o explica cómo hacerlo (iPhone). Devuelve el disparador y el diálogo. */
function useInstallAction() {
  const { mode, install } = useInstallApp();
  const [showSteps, setShowSteps] = useState(false);

  const start = async () => {
    if (mode === "ios") {
      setShowSteps(true);
      return;
    }
    if (await install()) toast.success("Agenda360 quedó instalada", { description: "Ábrela desde su icono en tu pantalla de inicio." });
  };

  const dialog = <IosInstallDialog open={showSteps} onOpenChange={setShowSteps} />;
  return { mode, start, dialog };
}

/** En el menú lateral: "Instalar aplicación" (no aparece si ya está instalada o no se puede). */
export function InstallAppButton() {
  const { mode, start, dialog } = useInstallAction();
  if (!mode) return null;
  return (
    <>
      <button
        type="button"
        onClick={start}
        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-ink outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="truncate">Instalar aplicación</span>
        <Download className="size-3.5 shrink-0" aria-hidden />
      </button>
      {dialog}
    </>
  );
}

const DISMISS_KEY = "agenda360:install-card-dismissed";

/** En Inicio, sólo en el celular: invita a instalarla una vez (se puede descartar). */
export function InstallAppCard({ className }: { className?: string }) {
  const { mode, start, dialog } = useInstallAction();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (!mode || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Sin almacenamiento: vuelve a aparecer en la próxima visita.
    }
  };

  return (
    <section
      aria-label="Instalar la aplicación"
      className={cn("relative flex items-start gap-3 rounded-xl border border-ink/15 bg-accent/70 p-4 pr-10", className)}
    >
      <BrandMark className="size-10" />
      <div className="min-w-0 space-y-2">
        <div>
          <p className="font-bold">Instala Agenda360 en tu celular</p>
          <p className="text-sm text-muted-foreground">Ábrela desde un icono en tu pantalla de inicio, como cualquier aplicación.</p>
        </div>
        <Button size="sm" onClick={start}>
          <Download /> {mode === "ios" ? "Cómo instalarla" : "Instalar"}
        </Button>
      </div>
      <Button variant="ghost" size="icon-sm" className="absolute top-2 right-2" aria-label="Ahora no" onClick={dismiss}>
        <X />
      </Button>
      {dialog}
    </section>
  );
}

/** iPhone y iPad: Apple no deja instalar con un botón; se hace desde Compartir. */
function IosInstallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Instalar en tu iPhone o iPad</DialogTitle>
          <DialogDescription>Tres toques y Agenda360 queda en tu pantalla de inicio.</DialogDescription>
        </DialogHeader>
        <ol className="grid gap-3 text-sm">
          <Step number={1}>
            Toca <Share className="inline size-4 align-text-bottom text-ink" aria-label="Compartir" /> <strong>Compartir</strong> en la
            barra de Safari (abajo, o arriba a la derecha en el iPad y en Chrome).
          </Step>
          <Step number={2}>
            Elige <SquarePlus className="inline size-4 align-text-bottom text-ink" aria-hidden /> <strong>Agregar a inicio</strong>. Si
            no lo ves, desliza la lista hacia arriba.
          </Step>
          <Step number={3}>
            Toca <strong>Agregar</strong>. Ábrela desde el icono de Agenda360 e inicia sesión una vez.
          </Step>
        </ol>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
        {number}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
