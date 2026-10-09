import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appointmentToInput } from "@/features/appointments/appointment-utils";
import { useOfferWhatsAppNotice } from "@/features/appointments/whatsapp-notice-context";
import { useBusinessId } from "@/features/auth/use-session";
import { useErrorToast } from "@/hooks/use-error-toast";
import { data, type AppointmentFilters } from "@/lib/data";
import type { AppointmentInput } from "@/lib/validations/appointment";
import { noticeForChange, noticeForStatus } from "@/lib/whatsapp";
import type { Appointment, AppointmentStatus } from "@/types";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useAppointments(filters: AppointmentFilters = {}, options: { keepPrevious?: boolean } = {}) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.appointmentList(businessId, filters),
    queryFn: () => data.appointments.list(businessId, filters),
    // Al navegar por la agenda se mantiene el rango anterior mientras carga el nuevo.
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

/**
 * Una cita por su id: sale al momento de la agenda ya cargada (si está) y se pide a la API sólo
 * si no está, sin descargar todas las citas.
 */
export function useAppointment(appointmentId: string | null | undefined) {
  const businessId = useBusinessId();
  const findCached = useCachedAppointment();
  return useQuery({
    queryKey: queryKeys.appointment(businessId, appointmentId ?? ""),
    queryFn: () => data.appointments.getById(businessId, appointmentId!),
    enabled: Boolean(appointmentId),
    placeholderData: () => (appointmentId ? findCached(appointmentId) : undefined),
  });
}

/** Resumen de las citas de cada cliente (totales, última y próxima cita), calculado en la API. */
export function useClientActivity() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.clientActivity(businessId),
    queryFn: () => data.clients.activity(businessId),
  });
}

/* ------------------------------------------------------------ Caché de la agenda -- */

/** Dónde está una cita: lo único que cambia al moverla en la agenda. */
type AppointmentSlot = Pick<Appointment, "date" | "startTime" | "endTime" | "professionalId">;

const slotOf = ({ date, startTime, endTime, professionalId }: AppointmentSlot): AppointmentSlot => ({
  date,
  startTime,
  endTime,
  professionalId,
});

const sameSlot = (a: AppointmentSlot, b: AppointmentSlot) =>
  a.date === b.date && a.startTime === b.startTime && a.endTime === b.endTime && a.professionalId === b.professionalId;

/** La caché con una cita cambiada: en las listas de la agenda y en la cita suelta. */
function updateCached(cached: unknown, id: string, update: (appointment: Appointment) => Appointment): unknown {
  if (Array.isArray(cached)) {
    return cached.map((item) => (item?.id === id && "startTime" in item ? update(item) : item));
  }
  const single = cached as Appointment | null | undefined;
  return single?.id === id && "startTime" in single ? update(single) : cached;
}

function setCachedAppointment(queryClient: QueryClient, businessId: string, id: string, update: (appointment: Appointment) => Appointment) {
  queryClient.setQueriesData({ queryKey: queryKeys.appointments(businessId) }, (cached: unknown) => updateCached(cached, id, update));
}

/**
 * La cita tal como está en la caché de la agenda (la copia más reciente, si sale en varias listas):
 * para saber qué cambió al guardarla y para guardar una cita movida con sus datos actuales.
 */
function findCachedAppointment(queryClient: QueryClient, businessId: string, id: string): Appointment | undefined {
  let latest: { appointment: Appointment; updatedAt: number } | undefined;
  for (const query of queryClient.getQueryCache().findAll({ queryKey: queryKeys.appointments(businessId) })) {
    const cached: unknown = query.state.data;
    // Listas de la agenda o una cita suelta (useAppointment).
    const found = Array.isArray(cached)
      ? (cached as Appointment[]).find((appointment) => appointment?.id === id && "startTime" in appointment)
      : (cached as Appointment | null | undefined)?.id === id
        ? (cached as Appointment)
        : undefined;
    if (found && (!latest || query.state.dataUpdatedAt > latest.updatedAt)) {
      latest = { appointment: found, updatedAt: query.state.dataUpdatedAt };
    }
  }
  return latest?.appointment;
}

function useCachedAppointment() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return (id: string) => findCachedAppointment(queryClient, businessId, id);
}

/* ---------------------------------------------------- Citas movidas en la agenda -- */

/** Segundos para deshacer una cita movida en la agenda, antes de guardarla. */
const UNDO_MS = 5000;

interface PendingMove {
  /** La cita antes del primer arrastre: "Deshacer" la devuelve ahí y el aviso de WhatsApp compara con ella. */
  previous: Appointment;
  /** Su nuevo sitio. */
  slot: AppointmentSlot;
  timer: ReturnType<typeof setTimeout>;
  toastId: string | number;
  /** Lo guarda. No falla: si la API lo rechaza, devuelve la cita a su sitio y muestra el error. */
  save: () => Promise<void>;
}

/**
 * Por cita, el movimiento que aún se puede deshacer y el guardado en curso. Viven fuera de los
 * componentes para que la ficha, el formulario y los cambios de estado de esa cita los esperen.
 */
const pendingMoves = new Map<string, PendingMove>();
const savingMoves = new Map<string, Promise<void>>();

/** La cita como la muestra la agenda: con su movimiento pendiente, si lo tiene. */
const withPendingMove = (appointment: Appointment): Appointment => {
  const pending = pendingMoves.get(appointment.id);
  return pending ? { ...appointment, ...pending.slot } : appointment;
};

/**
 * Guarda ya el movimiento pendiente de una cita (si lo tiene) y espera a que termine. Va antes de
 * abrir su ficha, editarla o cambiarle el estado: el guardado diferido envía la cita completa y, si
 * llegara después, desharía esos cambios (una cita cancelada volvía a "pendiente").
 */
export function settleAppointmentMove(appointmentId: string): Promise<void> {
  const pending = pendingMoves.get(appointmentId);
  if (pending) {
    clearTimeout(pending.timer);
    toast.dismiss(pending.toastId);
    pendingMoves.delete(appointmentId);
    // Detrás del guardado anterior de esa cita, si aún no terminó: que lleguen en orden.
    const saving = (savingMoves.get(appointmentId) ?? Promise.resolve()).then(pending.save);
    savingMoves.set(appointmentId, saving);
    void saving.then(() => {
      if (savingMoves.get(appointmentId) === saving) savingMoves.delete(appointmentId);
    });
  }
  return savingMoves.get(appointmentId) ?? Promise.resolve();
}

/* --------------------------------------------------------------------- Guardar -- */

function useInvalidateAppointments() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return () =>
    Promise.all([
      queryClient
        .invalidateQueries({ queryKey: queryKeys.appointments(businessId) })
        // La agenda recargada trae en su sitio de antes las citas movidas aún sin guardar: se vuelven
        // a mostrar donde quedaron.
        .then(() =>
          pendingMoves.forEach(({ slot }, id) =>
            setCachedAppointment(queryClient, businessId, id, (appointment) => ({ ...appointment, ...slot })),
          ),
        ),
      invalidateActivity(),
    ]);
}

/**
 * Tras guardar una cita: la que devolvió la API se ve al momento en la agenda y en la ficha, y la
 * agenda se recarga después, sin esperarla. Con red lenta (móvil) los diálogos seguían abiertos hasta
 * recargar y la agenda recargada ya traía la cita guardada (el formulario la veía solaparse consigo misma).
 */
function useApplySavedAppointment() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAppointments();
  return (saved?: Appointment) => {
    if (saved) setCachedAppointment(queryClient, businessId, saved.id, () => withPendingMove(saved));
    void invalidate();
  };
}

export function useSaveAppointment() {
  const businessId = useBusinessId();
  const applySaved = useApplySavedAppointment();
  const findCached = useCachedAppointment();
  const offerWhatsApp = useOfferWhatsAppNotice();
  return useMutation({
    // `previous`: la cita antes del cambio, si la caché ya muestra la nueva (citas movidas en la agenda).
    // `fromMove`: el guardado diferido de un movimiento de la agenda.
    mutationFn: async ({ id, input, fromMove }: { id?: string; input: AppointmentInput; previous?: Appointment; fromMove?: boolean }) => {
      if (!id) return data.appointments.create(businessId, input);
      // Si se acaba de mover en la agenda, ese movimiento se guarda antes: si no, pisaría esta edición.
      if (!fromMove) await settleAppointmentMove(id);
      return data.appointments.update(businessId, id, input);
    },
    onMutate: ({ id, previous }) => ({ previous: previous ?? (id ? findCached(id) : undefined) }),
    onSuccess: (saved, { id }, context) => {
      // Al editar: el aviso del nuevo estado o el de "reprogramada" (fecha, hora, servicio, profesional o lugar).
      const previous = context?.previous;
      if (previous) offerWhatsApp(saved, noticeForChange(previous, saved), previous);
      applySaved(id ? saved : undefined);
    },
  });
}

/**
 * Mover una cita arrastrándola: la agenda la muestra al momento en su nuevo sitio, pero se guarda
 * pasados unos segundos. Así "Deshacer" no llega a avisar al paciente (ni le envía dos emails). Si se
 * vuelve a mover antes, se guarda una sola vez (un aviso), y "Deshacer" la devuelve a su sitio inicial.
 */
export function useMoveAppointment() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const save = useSaveAppointment();
  const showError = useErrorToast();
  const show = (id: string, slot: AppointmentSlot) =>
    setCachedAppointment(queryClient, businessId, id, (appointment) => ({ ...appointment, ...slot }));

  return async (appointment: Appointment, moved: Appointment, message: string) => {
    const id = appointment.id;
    // Que una recarga en curso no la devuelva a su sitio mientras tanto.
    await queryClient.cancelQueries({ queryKey: queryKeys.appointments(businessId) });
    const earlier = pendingMoves.get(id);
    if (earlier) {
      clearTimeout(earlier.timer);
      toast.dismiss(earlier.toastId);
    }
    const previous = earlier?.previous ?? appointment;
    const slot = slotOf(moved);
    show(id, slot);

    const saveMove = async () => {
      if (sameSlot(slot, previous)) return;
      // Con los datos actuales de la cita (su estado o su nota pudieron cambiar): sólo cambian la
      // fecha, la hora y el profesional.
      const current = findCachedAppointment(queryClient, businessId, id) ?? previous;
      try {
        await save.mutateAsync({ id, input: appointmentToInput({ ...current, ...slot }), previous, fromMove: true });
      } catch (error) {
        show(id, slotOf(previous));
        void queryClient.invalidateQueries({ queryKey: queryKeys.appointments(businessId) });
        showError(error);
      }
    };
    const toastId = toast.success(message, {
      duration: UNDO_MS,
      action: {
        label: "Deshacer",
        onClick: () => {
          // Sólo si aún no se guardó ni se volvió a mover.
          const pending = pendingMoves.get(id);
          if (pending?.toastId !== toastId) return;
          clearTimeout(pending.timer);
          pendingMoves.delete(id);
          show(id, slotOf(previous));
        },
      },
    });
    pendingMoves.set(id, {
      previous,
      slot,
      toastId,
      save: saveMove,
      timer: setTimeout(() => void settleAppointmentMove(id), UNDO_MS),
    });
  };
}

/** Llegada del paciente: recepción la marca al verlo en la sala de espera. */
export function useSetAppointmentArrival() {
  const businessId = useBusinessId();
  const applySaved = useApplySavedAppointment();
  return useMutation({
    mutationFn: ({ id, arrived }: { id: string; arrived: boolean }) => data.appointments.setArrival(businessId, id, arrived),
    onSuccess: (appointment) => applySaved(appointment),
  });
}

/** Marca la cita como pagada (o lo deshace). */
export function useSetAppointmentPaid() {
  const businessId = useBusinessId();
  const applySaved = useApplySavedAppointment();
  return useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) => data.appointments.setPaid(businessId, id, paid),
    onSuccess: (appointment) => applySaved(appointment),
  });
}

/** Comprobantes de pago que envió el paciente (sólo si la cita tiene alguno). */
export function useAppointmentReceipts(appointment: Pick<Appointment, "id" | "receiptAt"> | null | undefined) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.receipts(businessId, appointment?.id ?? ""),
    queryFn: () => data.appointments.listReceipts(businessId, appointment!.id),
    enabled: Boolean(appointment?.receiptAt),
  });
}

/** Abre un comprobante (URL firmada de unos minutos) en otra pestaña. */
export async function openPaymentReceipt(businessId: string, receiptId: string): Promise<void> {
  // La pestaña se abre antes de esperar a la API: si no, el navegador la bloquea como emergente.
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    const { url } = await data.appointments.getReceiptUrl(businessId, receiptId);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export function useUpdateAppointmentStatus() {
  const businessId = useBusinessId();
  const applySaved = useApplySavedAppointment();
  const findCached = useCachedAppointment();
  const offerWhatsApp = useOfferWhatsAppNotice();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      // Si se acaba de mover en la agenda, ese movimiento se guarda antes: si no, la devolvería a su estado anterior.
      await settleAppointmentMove(id);
      return data.appointments.updateStatus(businessId, id, status);
    },
    onMutate: ({ id }) => ({ previous: findCached(id) }),
    onSuccess: (appointment, { status }, context) => {
      const previous = context?.previous;
      offerWhatsApp(appointment, previous ? noticeForChange(previous, appointment) : noticeForStatus(status), previous);
      // Sin esperar la recarga: "¿Cancelar esta cita?" se cierra al responder la API (no queda
      // apilada con el aviso de WhatsApp) y la cita ya se ve con su nuevo estado.
      applySaved(appointment);
    },
  });
}
