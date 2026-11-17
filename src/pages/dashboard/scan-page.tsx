import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { RequirePermission } from "@/components/layout/require-permission";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent } from "@/components/ui/card";
import { PatientInviteButton } from "@/features/loyalty/patient-invite-dialog";
import { ScanPanel } from "@/features/loyalty/scan-panel";

/** «Escanear» (spec 052): la cámara para el QR del paciente; /q/:token trae aquí el token (?qr=) y lo busca directo. */
export default function ScanPage() {
  return (
    <RequirePermission permission="appointments.manage">
      <ScanPageContent />
    </RequirePermission>
  );
}

function ScanPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get("qr");
  // El ?qr= se guarda y se quita de la dirección: recargar o volver atrás no repite el escaneo, que puede dejar una
  // cita atendida (revisión del 2026-11-16). Uno nuevo (otro /q/…) cambia el panel.
  const [seen, setSeen] = useState(fromUrl);
  const [linkToken, setLinkToken] = useState(fromUrl);
  if (fromUrl !== seen) {
    setSeen(fromUrl);
    if (fromUrl) setLinkToken(fromUrl);
  }
  useEffect(() => {
    if (fromUrl) setSearchParams({}, { replace: true });
  }, [fromUrl, setSearchParams]);

  return (
    <div className="space-y-6">
      <PageTitle title="Escanear" />
      <PageHeader
        title="Escanear"
        description="El QR de la tarjeta del paciente: marca su cita de hoy como atendida."
        actions={<PatientInviteButton />}
      />
      <Card className="max-w-md">
        <CardContent>
          <ScanPanel key={linkToken ?? "camera"} initialToken={linkToken} onReset={() => setLinkToken(null)} />
        </CardContent>
      </Card>
    </div>
  );
}
