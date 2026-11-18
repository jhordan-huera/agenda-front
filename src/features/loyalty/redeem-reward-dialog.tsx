import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getServiceName } from "@/features/appointments/appointment-utils";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments } from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useRedeemReward } from "@/hooks/queries/use-loyalty";
import { useBusinessNow } from "@/hooks/use-business-now";
import { describeBenefit, formatRewardCode } from "@/lib/constants/loyalty";
import { getErrorMessage } from "@/lib/data";
import { capitalize, formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Appointment, LoyaltyReward } from "@/types";
import { redeemPriceNote } from "./loyalty-text";

const NO_APPOINTMENT = "none";
/** Además de las de hoy, las próximas que se ven sin «Ver más citas». */
const UPCOMING_SHOWN = 3;

/**
 * «Canjear» una recompensa (spec 052). Se elige la cita del paciente (las de hoy y las próximas, sin las canceladas)
 * o «Sin cita». En una cita que no está pagada, el descuento baja su precio: el diálogo dice cuánto antes de canjear.
 * Desde la cita («Canjear en esta cita») llega con esa cita ya elegida.
 */
export function RedeemRewardDialog({
  reward,
  appointment,
  onOpenChange,
}: {
  /** null: cerrado. */
  reward: LoyaltyReward | null;
  /** La cita desde la que se canjea: sólo esa o «Sin cita». */
  appointment?: Appointment;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={reward !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        {reward &&
          (appointment ? (
            <RedeemForm key={reward.id} reward={reward} options={[appointment]} fixed onDone={() => onOpenChange(false)} />
          ) : (
            <ClientRedeemForm key={reward.id} reward={reward} onDone={() => onOpenChange(false)} />
          ))}
      </DialogContent>
    </Dialog>
  );
}

/** Desde la ficha o «Recompensas»: las citas del paciente desde hoy (también las de pareja o de familia). */
function ClientRedeemForm({ reward, onDone }: { reward: LoyaltyReward; onDone: () => void }) {
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const appointmentsQuery = useAppointments({ clientId: reward.clientId, from: now.date });
  // Sólo las citas donde el canje vale (revisión de seguridad 2026-11-18; la API lo comprueba igual): «Servicio gratis»,
  // en una de ese servicio; un premio que cambia el precio, nunca en una sesión con varios pacientes.
  const changesPrice = reward.kind !== "custom";
  const options = (appointmentsQuery.data ?? []).filter(
    (item) =>
      item.status !== "cancelled" &&
      item.date >= now.date &&
      (reward.kind !== "free_service" || item.serviceId === reward.serviceId) &&
      (!changesPrice || item.extraClientIds.length === 0),
  );
  return <RedeemForm reward={reward} options={options} loading={appointmentsQuery.isPending} onDone={onDone} />;
}

function RedeemForm({
  reward,
  options,
  loading = false,
  fixed = false,
  onDone,
}: {
  reward: LoyaltyReward;
  options: Appointment[];
  loading?: boolean;
  /** Desde la cita: sólo esa (ya elegida) o «Sin cita». */
  fixed?: boolean;
  onDone: () => void;
}) {
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const { servicesById } = useLookups();
  const [chosen, setChosen] = useState<string | null>(fixed ? (options[0]?.id ?? null) : null);
  // Sin elegir todavía: la primera cita de hoy, si tiene; si no, «Sin cita» (no se descuenta una cita futura sin querer).
  const selected = chosen ?? options.find((item) => item.date === now.date)?.id ?? NO_APPOINTMENT;
  const selectedAppointment = options.find((item) => item.id === selected) ?? null;
  const redeem = useRedeemReward();
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const currency = business?.currency;
  // Las de hoy y las 3 siguientes; el resto, con «Ver más citas» (un paciente puede tener muchas por delante).
  const todayCount = options.filter((item) => item.date === now.date).length;
  const visible = showAll ? options : options.filter((item, index) => index < todayCount + UPCOMING_SHOWN || item.id === selected);
  const hidden = options.length - visible.length;

  const label = (item: Appointment) =>
    `${item.date === now.date ? "Hoy" : capitalize(formatDate(item.date, "EEE d 'de' MMM"))} · ${item.startTime} · ${getServiceName(servicesById, item.serviceId)}`;

  const submit = async () => {
    setError(null);
    try {
      await redeem.mutateAsync({ rewardId: reward.id, appointmentId: selectedAppointment?.id ?? null });
      toast.success(`Canjeamos «${reward.name}» de ${reward.clientName.split(" ")[0]}`);
      onDone();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  const choice = (value: string, title: string, detail: string) => {
    const checked = selected === value;
    return (
      <button
        key={value}
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={() => setChosen(value)}
        className={cn(
          "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          checked && "border-primary bg-accent hover:bg-accent",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
            checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
          )}
          aria-hidden
        >
          {checked && <Check className="size-3" />}
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
      </button>
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="leading-snug">Canjear «{reward.name}»</DialogTitle>
        <DialogDescription>
          De {reward.clientName} · código <span className="font-mono text-foreground">{formatRewardCode(reward.code)}</span>.{" "}
          {describeBenefit(reward.kind, reward.value, reward.serviceName, currency)}.
          {reward.conditions && <span className="mt-1 block">Condiciones: {reward.conditions}</span>}
        </DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">¿En qué cita?</legend>
        <div role="radiogroup" aria-label="¿En qué cita?" className="grid gap-2">
          {loading ? (
            <Skeleton className="h-14 rounded-lg" />
          ) : (
            visible.map((item) =>
              choice(item.id, label(item), item.paidAt ? `${formatCurrency(item.price, currency)} · ya pagada` : formatCurrency(item.price, currency)),
            )
          )}
          {choice(NO_APPOINTMENT, "Sin cita", "Se marca como canjeada y no cambia ningún precio.")}
        </div>
        {hidden > 0 && (
          <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setShowAll(true)}>
            Ver más citas ({hidden})
          </Button>
        )}
        {!loading && !fixed && options.length === 0 && (
          <p className="text-xs text-muted-foreground">No tiene citas de hoy ni próximas.</p>
        )}
      </fieldset>

      <p role="status" className="rounded-lg bg-muted/60 p-3 text-sm">
        {redeemPriceNote(
          reward,
          selectedAppointment ? { price: selectedAppointment.price, paid: selectedAppointment.paidAt !== null } : null,
          currency,
        )}{" "}
        Se canjea una sola vez y queda en la actividad.
      </p>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={redeem.isPending}>
          Cancelar
        </Button>
        <SubmitButton type="button" loading={redeem.isPending} loadingText="Canjeando…" disabled={loading} onClick={submit}>
          Canjear
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
