import { ScanQrCode } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// El panel (y la cámara) se descargan al abrir «Escanear» por primera vez: la Agenda y el Inicio no los cargan.
const ScanPanel = lazy(() => import("./scan-panel").then((module) => ({ default: module.ScanPanel })));

/**
 * «Escanear» (spec 052), en la Agenda y en Inicio: el botón y su diálogo con la cámara. La cámara se apaga al
 * cerrarlo. Para quien maneja citas (el rol Profesional, en su agenda). `compact`: sólo el ícono entre 640 y 1536 px
 * (la Agenda y el Inicio ya tienen varios botones y «Nueva cita» pasaba a otra fila).
 */
export function ScanButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" variant="outline" title="Escanear el QR del paciente" onClick={() => setOpen(true)}>
        <ScanQrCode aria-hidden />
        <span className={compact ? "sm:sr-only 2xl:not-sr-only" : undefined}>Escanear</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear el QR del paciente</DialogTitle>
            <DialogDescription>Marca su cita de hoy como atendida. La primera vez, eliges quién es entre las citas de hoy.</DialogDescription>
          </DialogHeader>
          {open && (
            <Suspense fallback={<Skeleton className="aspect-square w-full rounded-xl" />}>
              <ScanPanel onNavigate={() => setOpen(false)} />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
