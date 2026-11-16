import { useSearchParams } from "react-router";
import { RequirePermission } from "@/components/layout/require-permission";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent } from "@/components/ui/card";
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
  const token = searchParams.get("qr");

  return (
    <div className="space-y-6">
      <PageTitle title="Escanear" />
      <PageHeader title="Escanear" description="El QR de la tarjeta del paciente: marca su cita de hoy como atendida." />
      <Card className="max-w-md">
        <CardContent>
          <ScanPanel
            // Con otro ?qr= (otro escaneo con la cámara del celular), se busca de nuevo.
            key={token ?? "camera"}
            initialToken={token}
            onReset={() => {
              if (token) setSearchParams({}, { replace: true });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
