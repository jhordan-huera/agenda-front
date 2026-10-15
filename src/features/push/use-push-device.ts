import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "@/features/auth/use-session";
import { queryKeys } from "@/hooks/queries/query-keys";
import { data, DataError, type PushDeviceInput } from "@/lib/data";
import type { PushConfig, PushKind } from "@/types";
import { getPushSupport, isSafari, keyBytes, markTurnedOff, sameKey, wasTurnedOff, type PushSupport } from "./push-support";

/**
 * Avisos en el celular de este navegador (spec 013, R17): la franja «Activa los avisos» y la tarjeta de
 * Configuración usan este hook, que comparte su estado por la caché de TanStack Query.
 *
 * Al abrir el panel sincroniza en silencio: con el permiso ya dado y una suscripción en el navegador,
 * la guarda en la API sin preguntar nada (se reanuda lo que pausó «Cerrar sesión», el aparato pasa a
 * quien entró y se arregla una dirección renovada). Nunca si esa persona lo desactivó aquí.
 */

/** Este navegador con los avisos activados: su dirección en el servicio de avisos y los tipos apagados. */
export interface ActiveDevice {
  endpoint: string;
  mutedKinds: PushKind[];
}

/**
 * `hidden`: no es para esta cuenta · `loading` · `error`: no se pudo preguntar a la API · `unavailable`:
 * la API no tiene claves · los de `PushSupport` (menos `ready`) · `off` · `on`.
 */
export type PushStatus = "hidden" | "loading" | "error" | "unavailable" | Exclude<PushSupport, "ready"> | "off" | "on";

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** El service worker listo (sólo en la versión compilada); null si no llega en 10 s. */
function serviceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  registration ??= Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
  ]).then(
    (ready) => {
      if (!ready) registration = null; // Que lo vuelva a intentar la próxima vez.
      return ready;
    },
    () => {
      registration = null;
      return null;
    },
  );
  return registration;
}

function toInput(subscription: PushSubscription, previousEndpoint?: string): PushDeviceInput {
  const { keys } = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: keys?.p256dh ?? "", auth: keys?.auth ?? "" },
    ...(previousEndpoint ? { previousEndpoint } : {}),
  };
}

/**
 * La sincronización silenciosa al abrir el panel. Si la clave pública cambió (R2), en Chrome, Edge y
 * Firefox se vuelve a suscribir sola; en Safari queda desactivado para que la franja ofrezca el toque.
 */
async function syncDevice(config: PushConfig, userId: string): Promise<ActiveDevice | null> {
  if (Notification.permission !== "granted" || wasTurnedOff(userId)) return null;
  const ready = await serviceWorkerReady();
  if (!ready) return null;
  let subscription = await ready.pushManager.getSubscription();
  if (!subscription) return null;
  let previousEndpoint: string | undefined;
  const key = keyBytes(config.publicKey!);
  if (!sameKey(subscription.options.applicationServerKey, key)) {
    previousEndpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => false);
    if (isSafari()) return null;
    subscription = await ready.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
  const device = await data.push.saveDevice(toInput(subscription, previousEndpoint));
  return { endpoint: subscription.endpoint, mutedKinds: device.mutedKinds };
}

export function usePushDevice(enabled: boolean) {
  const { session } = useSession();
  const userId = session?.userId ?? "";
  const queryClient = useQueryClient();
  const [support, setSupport] = useState(getPushSupport);
  const active = enabled && Boolean(userId);

  const config = useQuery({
    queryKey: queryKeys.push.config(userId),
    queryFn: () => data.push.getConfig(),
    enabled: active,
    staleTime: Infinity,
    retry: false,
  });
  const canSync = active && config.data?.available === true && Boolean(config.data.publicKey) && support === "ready";
  const device = useQuery({
    queryKey: queryKeys.push.device(userId),
    queryFn: () => syncDevice(config.data!, userId),
    enabled: canSync,
    staleTime: Infinity,
    retry: false,
  });

  // El permiso sólo se pide como respuesta a un toque: el service worker queda listo antes.
  useEffect(() => {
    if (canSync) void serviceWorkerReady();
  }, [canSync]);

  const setDevice = (value: ActiveDevice | null) => queryClient.setQueryData(queryKeys.push.device(userId), value);

  /**
   * «Activar»: `pushManager.subscribe` pide el permiso del navegador dentro del mismo toque (sin nada de
   * la red antes), guarda el aparato y manda el aviso de prueba. Si la prueba no sale, quedan activados igual.
   */
  const activate = useMutation({
    mutationFn: async (): Promise<{ tested: boolean }> => {
      const publicKey = config.data?.publicKey;
      if (!publicKey) throw new DataError("unavailable", "Los avisos en el celular todavía no están disponibles.");
      const ready = await serviceWorkerReady();
      if (!ready) throw new DataError("unavailable", "La app todavía se está preparando. Recarga la página e inténtalo de nuevo.");
      const key = keyBytes(publicKey);
      let subscription = await ready.pushManager.getSubscription();
      if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
        await subscription.unsubscribe().catch(() => false);
        subscription = null;
      }
      if (!subscription) {
        try {
          subscription = await ready.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        } catch {
          setSupport(getPushSupport());
          if (Notification.permission === "denied") {
            throw new DataError("forbidden", "Bloqueaste los avisos en este navegador. En la tarjeta de Configuración verás cómo permitirlos.");
          }
          if (Notification.permission === "default") throw new DataError("validation", "Para activar los avisos, acepta el permiso del navegador.");
          throw new DataError("unavailable", "Este navegador no pudo conectarse con su servicio de avisos. Inténtalo de nuevo en un momento.");
        }
      }
      const saved = await data.push.saveDevice(toInput(subscription));
      markTurnedOff(userId, false);
      setDevice({ endpoint: subscription.endpoint, mutedKinds: saved.mutedKinds });
      try {
        await data.push.sendTest(subscription.endpoint);
        return { tested: true };
      } catch (error) {
        // El servicio de avisos dio de baja este aparato (la API ya lo borró): se ofrece activarlo otra vez.
        if (error instanceof DataError && error.code === "conflict") {
          await subscription.unsubscribe().catch(() => false);
          setDevice(null);
          throw new DataError("conflict", "El servicio de avisos de tu navegador no aceptó este aparato. Vuelve a activarlos en un momento.");
        }
        return { tested: false };
      }
    },
  });

  /** «Desactivar en este celular»: lo borra de la API, quita la suscripción del navegador y lo recuerda. */
  const deactivate = useMutation({
    mutationFn: async () => {
      const endpoint = device.data?.endpoint;
      if (endpoint) await data.push.turnOff(endpoint);
      const ready = await serviceWorkerReady();
      const subscription = await ready?.pushManager.getSubscription();
      await subscription?.unsubscribe().catch(() => false);
      markTurnedOff(userId, true);
      setDevice(null);
    },
  });

  /** Un interruptor: se guarda al momento (y vuelve atrás si falla). */
  const setKind = useMutation({
    mutationFn: async ({ kind, on }: { kind: PushKind; on: boolean }) => {
      const current = device.data;
      if (!current) throw new DataError("not_found", "Este aparato no tiene los avisos activados. Vuelve a activarlos.");
      const mutedKinds = on ? current.mutedKinds.filter((muted) => muted !== kind) : [...new Set([...current.mutedKinds, kind])];
      setDevice({ ...current, mutedKinds });
      try {
        const saved = await data.push.updateKinds(current.endpoint, mutedKinds);
        setDevice({ ...current, mutedKinds: saved.mutedKinds });
      } catch (error) {
        setDevice(current);
        throw error;
      }
      return { kind, on };
    },
  });

  const sendTest = useMutation({
    mutationFn: () => data.push.sendTest(device.data!.endpoint),
    // El servicio de avisos dice que este aparato ya no existe: hay que volver a activarlos.
    onError: (error) => {
      if (error instanceof DataError && error.code === "conflict") setDevice(null);
    },
  });

  let status: PushStatus;
  if (!active) status = "hidden";
  else if (config.isPending) status = "loading";
  else if (config.isError) status = config.error instanceof DataError && config.error.code === "forbidden" ? "hidden" : "error";
  else if (!config.data.available || !config.data.publicKey) status = "unavailable";
  else if (support !== "ready") status = support;
  else if (device.isPending) status = "loading";
  else status = device.data ? "on" : "off";

  return {
    status,
    kinds: config.data?.kinds ?? [],
    device: device.data ?? null,
    activate,
    deactivate,
    setKind,
    sendTest,
    retry: () => void config.refetch(),
  };
}
