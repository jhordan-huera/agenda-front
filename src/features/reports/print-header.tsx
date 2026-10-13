import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import type { Business } from "@/types";

/** Encabezado que sólo sale al imprimir o guardar en PDF: de quién es el reporte y de qué periodo. */
export function ReportPrintHeader({
  business,
  periodLabel,
  previousLabel,
  professionalName,
}: {
  business: Pick<Business, "name" | "logoUrl" | "timezone">;
  periodLabel: string;
  previousLabel: string;
  professionalName?: string;
}) {
  const [generatedAt] = useState(() => new Date().toISOString());
  return (
    <div className="hidden items-center justify-between gap-6 border-b pb-4 print:flex">
      <div className="flex items-center gap-3">
        {business.logoUrl && <img src={business.logoUrl} alt="" className="size-12 rounded-lg object-cover" />}
        <div>
          <p className="text-xl font-extrabold">{business.name}</p>
          <p className="text-sm text-muted-foreground">Reporte{professionalName ? ` de ${professionalName}` : ""}</p>
        </div>
      </div>
      <div className="text-right text-sm">
        <p className="font-semibold">{periodLabel}</p>
        <p className="text-muted-foreground">Comparado con {previousLabel}</p>
        <p className="text-muted-foreground">Generado el {formatDateTime(generatedAt, business.timezone)}</p>
      </div>
    </div>
  );
}
