import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import type { ClientInput, ConfirmClaimInput } from "@/lib/validations/client";
import type { ClientImportInput } from "@/lib/validations/client-import";
import type { Client } from "@/types";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useClients() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.clients(businessId),
    queryFn: () => data.clients.list(businessId),
  });
}

export function useClient(clientId: string) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.client(businessId, clientId),
    queryFn: () => data.clients.getById(businessId, clientId),
  });
}

export function useSaveClient() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ClientInput }) =>
      id ? data.clients.update(businessId, id, input) : data.clients.create(businessId, input),
    onSuccess: (saved) => {
      // El cliente guardado, al momento (p. ej. el recién creado desde una cita ya sale elegido en
      // ella); las listas se recargan después, sin esperar: el diálogo se cierra al responder la API.
      queryClient.setQueryData<Client[]>(queryKeys.clients(businessId), (current) =>
        current && (current.some((client) => client.id === saved.id)
          ? current.map((client) => (client.id === saved.id ? saved : client))
          : [...current, saved]),
      );
      queryClient.setQueryData(queryKeys.client(businessId, saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients(businessId) });
      void invalidateActivity();
    },
  });
}

export function useDeleteClient() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (clientId: string) => data.clients.remove(businessId, clientId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients(businessId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments(businessId) });
      void invalidateActivity();
    },
  });
}

/**
 * Une un paciente «Por verificar» a su ficha (spec 009): sus citas pasan a ella, así que se recargan
 * los pacientes y las citas.
 */
export function useConfirmClaim() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: ({ clientId, input }: { clientId: string; input: ConfirmClaimInput }) =>
      data.clients.confirmClaim(businessId, clientId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients(businessId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments(businessId) });
      void invalidateActivity();
    },
  });
}

/**
 * Importa pacientes desde un Excel o un CSV (spec 012). Al terminar se recargan la lista de pacientes,
 * el uso del plan y la actividad.
 */
export function useImportClients() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (input: ClientImportInput) => data.clients.importMany(businessId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients(businessId) });
      void invalidateActivity();
    },
  });
}
