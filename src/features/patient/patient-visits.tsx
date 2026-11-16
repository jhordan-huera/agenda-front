import { formatDate } from "@/lib/format";
import type { PatientCard } from "@/types";
import { PatientDisclosure } from "./patient-disclosure";

/** «Tus visitas»: las citas que sumaron sello en este consultorio (la fecha y el servicio), las más recientes primero. */
export function PatientVisits({ visits }: { visits: PatientCard["visits"] }) {
  if (visits.length === 0) return null;
  return (
    <PatientDisclosure title="Tus visitas" count={visits.length}>
      <ul className="divide-y">
        {visits.map((visit, index) => (
          <li key={`${visit.date}-${index}`} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0 break-words">{visit.serviceName}</span>
            <span className="shrink-0 text-muted-foreground">{formatDate(visit.date, "d MMM yyyy")}</span>
          </li>
        ))}
      </ul>
    </PatientDisclosure>
  );
}
