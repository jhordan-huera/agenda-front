import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data, type LoyaltyRewardFilters } from "@/lib/data";
import type { ClientInput } from "@/lib/validations/client";
import type { LoyaltyBenefitKind, ScanResult } from "@/types";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

/*
 * La tarjeta de fidelización (spec 052), lo del equipo: el programa y los beneficios («Fidelización», propietario y
 * administradores), la ficha y la cita (todo el equipo; el rol Profesional, sus pacientes), el canje (también
 * Recepción) y «Escanear» (quien maneja citas). Un minuto de caché: una cita atendida o un canje lo recargan.
 */

/** Lo que manda el formulario de un beneficio (lo valida `loyaltyBenefitSchema`). */
export interface LoyaltyBenefitInput {
  name: string;
  description: string;
  visitsRequired: number;
  kind: LoyaltyBenefitKind;
  value: number | null;
  serviceId: string | null;
  conditions: string;
  validDays: number | null;
  isActive: boolean;
}

function useInvalidateLoyalty() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.all(businessId) }), invalidateActivity()]);
}

export function useLoyaltyProgram(enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.loyalty.program(businessId),
    queryFn: () => data.loyalty.program(businessId),
    enabled,
    staleTime: 60_000,
  });
}

/** Guardar el programa: encenderla, apagarla, el nombre, el sello y qué pasa al terminar. */
export function useSaveLoyaltyProgram() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLoyalty();
  return useMutation({
    mutationFn: (input: unknown) => data.loyalty.saveProgram(businessId, input),
    onSuccess: (program) => {
      queryClient.setQueryData(queryKeys.loyalty.program(businessId), program);
      void invalidate();
    },
  });
}

export function useLoyaltyBenefits(enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.loyalty.benefits(businessId),
    queryFn: () => data.loyalty.benefits(businessId),
    enabled,
    staleTime: 60_000,
  });
}

/** Crear (sin `id`) o editar un beneficio; también activarlo y desactivarlo. Lo ya ganado no cambia. */
export function useSaveLoyaltyBenefit() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateLoyalty();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: LoyaltyBenefitInput }) =>
      id ? data.loyalty.updateBenefit(businessId, id, input) : data.loyalty.createBenefit(businessId, input),
    // Al guardar, quien ya llegaba a esas citas lo gana: cambian las cifras, los pacientes y las recompensas.
    onSuccess: () => invalidate(),
  });
}

/** «Eliminar»: lo borra si nadie lo ganó; si alguien lo ganó, lo archiva (`archived`). */
export function useDeleteLoyaltyBenefit() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateLoyalty();
  return useMutation({
    mutationFn: (benefitId: string) => data.loyalty.deleteBenefit(businessId, benefitId),
    onSuccess: () => invalidate(),
  });
}

/** «Pacientes» de Fidelización: los que les falta menos para su próximo premio, primero (lo ordena la API). */
export function useLoyaltyMembers(enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.loyalty.members(businessId),
    queryFn: () => data.loyalty.members(businessId),
    enabled,
    staleTime: 60_000,
  });
}

/** «Recompensas» de Fidelización, con sus filtros; `code` busca una por su código. */
export function useLoyaltyRewards(filters: LoyaltyRewardFilters, enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.loyalty.rewards(businessId, filters),
    queryFn: () => data.loyalty.rewards(businessId, filters),
    enabled,
    staleTime: 60_000,
  });
}

/** Las cifras de arriba de «Fidelización». */
export function useLoyaltySummary(enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.loyalty.summary(businessId),
    queryFn: () => data.loyalty.summary(businessId),
    enabled,
    staleTime: 60_000,
  });
}

/** El bloque «Tarjeta de fidelización» de la ficha: el programa, la tarjeta del paciente y sus recompensas. */
export function useClientLoyalty(clientId: string, enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.loyalty.client(businessId, clientId),
    queryFn: () => data.loyalty.clientLoyalty(businessId, clientId),
    enabled: enabled && Boolean(clientId),
    staleTime: 60_000,
  });
}

/** La tarjeta de cada paciente de una cita (hasta 3), para «Tiene 1 premio disponible». */
export function useClientsLoyalty(clientIds: string[], enabled = true) {
  const businessId = useBusinessId();
  return useQueries({
    queries: clientIds.map((clientId) => ({
      queryKey: queryKeys.loyalty.client(businessId, clientId),
      queryFn: () => data.loyalty.clientLoyalty(businessId, clientId),
      enabled,
      staleTime: 60_000,
    })),
  });
}

/**
 * «Canjear», en una cita del paciente o sin cita. En una cita sin pagar, su precio baja: se recargan la tarjeta, las
 * citas (la agenda, la ficha y «Por cobrar» cuelgan de "appointments") y la actividad.
 */
export function useRedeemReward() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLoyalty();
  return useMutation({
    mutationFn: ({ rewardId, appointmentId }: { rewardId: string; appointmentId: string | null }) =>
      data.loyalty.redeem(businessId, rewardId, appointmentId),
    onSuccess: () =>
      Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: queryKeys.appointments(businessId) })]),
  });
}

/* -- «Escanear» -- */

/** Después de un escaneo que unió una cuenta o marcó una cita: la tarjeta, la Agenda y los controles al día. */
function useAfterScan() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLoyalty();
  return (result: ScanResult, changedClients = false) =>
    Promise.all([
      invalidate(),
      ...(result.status === "linked" && result.completedNow
        ? [
            queryClient.invalidateQueries({ queryKey: queryKeys.appointments(businessId) }),
            // Una cita atendida puede darle un control (spec 051).
            queryClient.invalidateQueries({ queryKey: ["control-reminders", businessId] }),
          ]
        : []),
      ...(changedClients ? [queryClient.invalidateQueries({ queryKey: queryKeys.clients(businessId) })] : []),
    ]);
}

/**
 * Leer el QR: si la cuenta todavía no está unida aquí, su nombre, las fichas con su teléfono y las citas de hoy; si
 * ya lo está, el paciente, y su única cita de hoy por atender queda atendida sola (`completedNow`).
 */
export function useScanQr() {
  const businessId = useBusinessId();
  const afterScan = useAfterScan();
  return useMutation({
    mutationFn: (token: string) => data.loyalty.scan(businessId, token),
    onSuccess: (result) => (result.status === "linked" && result.completedNow ? afterScan(result) : undefined),
  });
}

/** Unir la cuenta (la primera vez en este negocio): a la ficha de una cita de hoy o a una con su mismo teléfono. */
export function useLinkScan() {
  const businessId = useBusinessId();
  const afterScan = useAfterScan();
  return useMutation({
    mutationFn: (input: { token: string; appointmentId: string | null; clientId: string }) => data.loyalty.link(businessId, input),
    onSuccess: (result) => afterScan(result),
  });
}

/** «Paciente nuevo»: crear su ficha con el teléfono de la cuenta y unirla. */
export function useScanNewClient() {
  const businessId = useBusinessId();
  const afterScan = useAfterScan();
  return useMutation({
    mutationFn: (input: { token: string; client: Omit<ClientInput, "phone" | "isActive"> }) => data.loyalty.newClient(businessId, input),
    onSuccess: (result) => afterScan(result, true),
  });
}

/** «Marcar como atendida» con el QR, si tiene varias citas hoy: por el mismo camino que la ficha (actividad, email, sello). */
export function useCompleteScan() {
  const businessId = useBusinessId();
  const afterScan = useAfterScan();
  return useMutation({
    mutationFn: (input: { token: string; appointmentId: string }) => data.loyalty.complete(businessId, input),
    onSuccess: (result) => afterScan(result),
  });
}

/** «Enlace para cambiar la contraseña»: de un solo uso, vence en 24 horas y queda en la actividad. */
/** «Desunir la cuenta» de la ficha (revisión de seguridad): la tarjeta de la ficha y la actividad se ponen al día. */
export function useUnlinkPatientAccount() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (clientId: string) => data.loyalty.unlink(businessId, clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.all(businessId) });
      invalidateActivity();
    },
  });
}

export function usePatientResetLink() {
  const businessId = useBusinessId();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (clientId: string) => data.loyalty.resetLink(businessId, clientId),
    onSuccess: () => invalidateActivity(),
  });
}
