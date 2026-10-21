import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data, DataError } from "@/lib/data";
import { prepareReceipt, uploadToStorage } from "@/lib/upload";
import type { ReceiptInput } from "@/lib/validations/payment";
import { queryKeys } from "./query-keys";

/**
 * La mensualidad del propietario (spec 029): la tarjeta de Configuración → Negocio y la pantalla de pago.
 *
 * Leerla crea en la API el cobro del mes si ya llegó su día de pago, así que no se pide a cada rato: al
 * abrir el panel y, al volver a la pestaña, si pasaron 10 minutos. Si la API todavía no la tiene (404, en la
 * ventana de publicación) o no es para esta cuenta (403), no hay pantalla ni tarjeta y no se vuelve a pedir.
 */

/** La API no tiene la ruta (404) o no es para esta cuenta (403). */
export const isBillingUnavailable = (error: unknown) =>
  error instanceof DataError && (error.code === "not_found" || error.code === "forbidden");

/** `enabled`: sólo la pide el propietario (y el super admin en modo soporte, que sólo la ve). */
export function useBusinessBilling(enabled: boolean) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.billing(businessId),
    queryFn: () => data.billing.get(businessId),
    enabled: enabled && Boolean(businessId),
    staleTime: 10 * 60_000,
    retry: (count, error) => !isBillingUnavailable(error) && count < 1,
  });
}

/**
 * Sube el comprobante de un cobro: las fotos se reducen antes (como las de los pacientes), el archivo va
 * directo al almacenamiento y la API pasa el cobro a «En revisión». Al terminar, la mensualidad se recarga:
 * sin pendiente, la pantalla de pago se cierra.
 */
export function useUploadBillingReceipt(chargeId: string) {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) => {
      const { body, contentType, fileName } = await prepareReceipt(file);
      const input = { fileName, contentType, sizeBytes: body.size } as ReceiptInput;
      const { receipt, upload } = await data.billing.requestReceiptUpload(businessId, chargeId, input);
      await uploadToStorage(upload, body, { contentType, onProgress });
      return data.billing.completeReceiptUpload(businessId, chargeId, receipt.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.billing(businessId) }),
  });
}

/** Abre un enlace firmado de unos minutos en otra pestaña (antes de esperar a la API: si no, el navegador la bloquea). */
export async function openSignedUrl(getUrl: () => Promise<{ url: string }>): Promise<void> {
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    const { url } = await getUrl();
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (error) {
    tab?.close();
    throw error;
  }
}
