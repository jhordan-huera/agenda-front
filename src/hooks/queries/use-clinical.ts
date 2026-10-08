import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import { fileContentType, uploadToStorage } from "@/lib/upload";
import type {
  ClinicalAddendumInput,
  ClinicalAttachmentInput,
  ClinicalNoteInput,
  ClinicalProfileInput,
  ClinicalTemplateInput,
} from "@/lib/validations/clinical";
import type { ClinicalTemplate } from "@/types";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useClinicalRecord(clientId: string, enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.clinicalRecord(businessId, clientId),
    queryFn: () => data.clinicalRecords.get(businessId, clientId),
    enabled,
  });
}

/** Formatos de evolución disponibles (cambian poco: se guardan 10 minutos). */
export function useClinicalTemplates(enabled = true, includeInactive = false) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.clinicalTemplateList(businessId, includeInactive),
    queryFn: () => data.clinicalRecords.listTemplates(businessId, includeInactive),
    staleTime: 10 * 60_000,
    enabled,
  });
}

/** Un formato (propio o de la plataforma) para editarlo o duplicarlo. */
export function useClinicalTemplate(templateId: string | undefined) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.clinicalTemplate(businessId, templateId ?? ""),
    queryFn: () => data.clinicalRecords.getTemplate(businessId, templateId!),
    enabled: Boolean(templateId),
  });
}

/** Tras crear o editar un formato se recargan las listas (y el propio formato). */
function useTemplateMutation<TVariables>(mutationFn: (businessId: string, variables: TVariables) => Promise<ClinicalTemplate>) {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(businessId, variables),
    // El negocio guarda cuál es su formato: también se recarga.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clinicalTemplates(businessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.business(businessId) }),
        invalidateActivity(),
      ]),
  });
}

export const useSaveClinicalTemplate = () =>
  useTemplateMutation((businessId, { id, input }: { id?: string; input: ClinicalTemplateInput }) =>
    id ? data.clinicalRecords.updateTemplate(businessId, id, input) : data.clinicalRecords.createTemplate(businessId, input),
  );

export const useSetClinicalTemplateActive = () =>
  useTemplateMutation((businessId, { id, active }: { id: string; active: boolean }) =>
    data.clinicalRecords.setTemplateActive(businessId, id, active),
  );

export const useSetDefaultClinicalTemplate = () =>
  useTemplateMutation((businessId, id: string) => data.clinicalRecords.setDefaultTemplate(businessId, id));

/** Tras escribir, se recarga la historia y la auditoría (que registra cada cambio). */
function useClinicalMutation<TVariables, TResult>(
  clientId: string,
  mutationFn: (businessId: string, variables: TVariables) => Promise<TResult>,
) {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(businessId, variables),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clinicalRecord(businessId, clientId) }),
        invalidateActivity(),
      ]),
  });
}

export const useSaveClinicalProfile = (clientId: string) =>
  useClinicalMutation(clientId, (businessId, input: ClinicalProfileInput) =>
    data.clinicalRecords.saveProfile(businessId, clientId, input),
  );

export const useAddClinicalNote = (clientId: string) =>
  useClinicalMutation(clientId, (businessId, input: ClinicalNoteInput) =>
    data.clinicalRecords.addNote(businessId, clientId, input),
  );

export const useAddClinicalAddendum = (clientId: string) =>
  useClinicalMutation(clientId, (businessId, { noteId, input }: { noteId: string; input: ClinicalAddendumInput }) =>
    data.clinicalRecords.addAddendum(businessId, noteId, input),
  );

/**
 * Sube un archivo a la historia: pide la URL firmada, el navegador lo envía directo al
 * almacenamiento (con progreso) y la API confirma que llegó.
 */
export const useUploadClinicalAttachment = (clientId: string) =>
  useClinicalMutation(
    clientId,
    async (businessId, { file, description, onProgress }: { file: File; description: string; onProgress?: (percent: number) => void }) => {
      const contentType = fileContentType(file);
      const input = { fileName: file.name, contentType, sizeBytes: file.size, description } as ClinicalAttachmentInput;
      const { attachment, upload } = await data.clinicalRecords.requestAttachmentUpload(businessId, clientId, input);
      await uploadToStorage(upload, file, { contentType, onProgress });
      return data.clinicalRecords.completeAttachmentUpload(businessId, attachment.id);
    },
  );

/** Abre un archivo (URL firmada de unos minutos) en otra pestaña. */
export async function openClinicalAttachment(businessId: string, attachmentId: string): Promise<void> {
  // La pestaña se abre antes de esperar a la API: si no, el navegador la bloquea como emergente.
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    const { url } = await data.clinicalRecords.getAttachmentUrl(businessId, attachmentId);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (error) {
    tab?.close();
    throw error;
  }
}
