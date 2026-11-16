import { useMemo } from "react";
import { renderSVG } from "uqr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { patientQrUrl } from "@/lib/constants/loyalty";
import { cn } from "@/lib/utils";
import type { PatientAccount } from "@/types";

/**
 * El QR del paciente (spec 052): el enlace `/q/<token>`, en negro sobre blanco a propósito, también con la pantalla
 * en oscuro, para que lo lea cualquier cámara. Corrección de errores media: aguanta un reflejo en la pantalla.
 */
export function PatientQrImage({ token, className }: { token: string; className?: string }) {
  const src = useMemo(() => {
    const svg = renderSVG(patientQrUrl(window.location.origin, token), {
      ecc: "M",
      border: 2,
      pixelSize: 10,
      blackColor: "#000000",
      whiteColor: "#ffffff",
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [token]);
  return <img src={src} alt="Tu código QR" className={cn("aspect-square bg-white", className)} data-testid="patient-qr" />;
}

/**
 * «Mostrar mi QR»: a pantalla completa, grande y con su nombre, para mostrarlo en la cita. Mientras se ve, la
 * pantalla no se apaga (si el navegador lo permite).
 */
export function PatientQrDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Pick<PatientAccount, "name" | "qrToken">;
}) {
  useWakeLock(open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col items-center justify-center gap-6 overflow-y-auto rounded-none bg-background px-4 py-10 ring-0 sm:max-w-none">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-xl leading-tight font-bold">Tu QR</DialogTitle>
          <DialogDescription>Muéstralo al profesional en tu cita.</DialogDescription>
        </DialogHeader>
        {/* La placa blanca va también en el oscuro: el QR necesita fondo blanco para escanearse. */}
        <div className="flex max-w-full flex-col items-center gap-3 rounded-3xl bg-white p-4 shadow-sheet sm:p-5">
          <PatientQrImage token={account.qrToken} className="size-[min(76vw,52dvh,22rem)]" />
          <p className="max-w-[min(76vw,22rem)] truncate text-center text-lg font-semibold text-black">{account.name}</p>
        </div>
        <Button size="lg" className="h-12 w-full max-w-xs text-base" onClick={() => onOpenChange(false)}>
          Listo
        </Button>
      </DialogContent>
    </Dialog>
  );
}
