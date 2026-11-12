import { useQuery } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import { queryKeys } from "./query-keys";

/**
 * Las opiniones de los pacientes (spec 048) de un periodo, un profesional o un paciente: el promedio, cuántas, cuántas
 * de cada estrella y las últimas. Sólo para quien ve Reportes (`enabled`); el rol Profesional, sólo las de su agenda.
 */
export function useSurveySummary(filters: { from?: string; to?: string; professionalId?: string; clientId?: string }, enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.surveys(businessId, filters),
    queryFn: () => data.surveys.summary(businessId, filters),
    enabled,
    staleTime: 60_000,
  });
}
