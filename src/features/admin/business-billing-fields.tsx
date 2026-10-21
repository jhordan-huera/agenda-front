import { useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSetBusinessBilling } from "@/hooks/queries/use-admin";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { formatUsdAmount } from "@/lib/constants/business";
import { describePlanPrice } from "@/lib/constants/plans";
import { getErrorMessage } from "@/lib/data";
import { formatDate, plural } from "@/lib/format";
import { addMonthsISO, dayOfMonthISO, getZonedNow } from "@/lib/time";
import { businessBillingSchema } from "@/lib/validations/admin";
import { validate } from "@/lib/validations/validate";
import type { AdminBusinessBilling, ISODate, PlanId } from "@/types";

interface BusinessBillingFieldsProps {
  businessId: string;
  billing: AdminBusinessBilling;
  plan: PlanId;
  /** La zona del negocio: de ella salen «hoy» y el día en que empezó su plan. */
  timezone: string;
  /** Desde cuándo tiene su plan (la creación del negocio, o el último cambio de plan): de ahí sale el día de pago. */
  planSince: string | null;
}

/** El primer día de pago después de hoy: el de este mes si todavía no llegó; si no, el del mes siguiente. */
function nextOccurrence(day: number, today: ISODate): ISODate {
  const thisMonth = dayOfMonthISO(today, day);
  return thisMonth > today ? thisMonth : dayOfMonthISO(addMonthsISO(today, 1), day);
}

/** La fecha (en la zona del negocio) de un instante ISO, como «desde cuándo tiene su plan». */
const dateIn = (timezone: string, iso: string) => {
  try {
    return getZonedNow(timezone, new Date(iso)).date;
  } catch {
    return getZonedNow(DEFAULT_TIMEZONE, new Date(iso)).date;
  }
};

const todayIn = (timezone: string) => {
  try {
    return getZonedNow(timezone).date;
  } catch {
    return getZonedNow(DEFAULT_TIMEZONE).date;
  }
};

/** El precio especial escrito («20,5» o «20.5»), o null si todavía no es un número. */
const typedFee = (text: string): number | null => {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" || !Number.isFinite(value) ? null : value;
};

/**
 * La mensualidad del negocio (spec 029), en «Suscripción y uso». Sale sola de su plan y sus agendas
 * (ampliación del 2026-10-20): «Mensualidad: $45,99 (Business con 5 agendas)», con «Poner precio especial»
 * para cobrarle otro monto (0: cortesía, sin cobros) y «Quitar» para volver al de su plan. El día de pago y el
 * primer cobro también salen solos, del día en que empezó su plan, y se pueden cambiar: otra fecha cambia el
 * día de pago, y otro día mueve la fecha a ese día. Todo vale desde el siguiente cobro y queda en la actividad
 * de la plataforma; el propietario sólo ve su total en su configuración, nunca el precio de su plan.
 */
export function BusinessBillingFields({ businessId, billing, plan, timezone, planSince }: BusinessBillingFieldsProps) {
  const save = useSetBusinessBilling();
  const today = todayIn(timezone);
  // El día en que empezó su plan, en la zona del negocio (sin dato, hoy).
  const planStart = planSince ? dateIn(timezone, planSince) : today;
  // null: el precio de su plan; un texto: el precio especial que se está escribiendo.
  const [special, setSpecial] = useState<string | null>(billing.customFee === null ? null : String(billing.customFee));
  const [day, setDay] = useState(billing.billingDay === null ? "" : String(billing.billingDay));
  const [start, setStart] = useState(billing.billingStart ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const specialInput = useRef<HTMLInputElement>(null);

  const planLabel = `${formatUsdAmount(billing.planPrice)} (${describePlanPrice(plan, billing.agendas)})`;
  const specialFee = special === null ? null : typedFee(special);
  const courtesy = special !== null && specialFee === 0;
  const values = {
    customFee: special === null ? null : special.trim().replace(",", "."),
    billingDay: day.trim() === "" ? null : Number(day),
    billingStart: start === "" ? null : start,
  };
  const changed =
    (special === null ? billing.customFee !== null : specialFee !== billing.customFee) ||
    values.billingDay !== billing.billingDay ||
    values.billingStart !== billing.billingStart;
  const automatic = day !== "" && Number(day) === Number(planStart.slice(8, 10));

  const putSpecial = () => {
    setSpecial("");
    // El campo aparece en este render: el foco, en el siguiente.
    requestAnimationFrame(() => specialInput.current?.focus());
  };
  const removeSpecial = () => {
    setSpecial(null);
    setErrors(({ customFee: _removed, ...rest }) => rest);
  };
  const changeDay = (next: string) => {
    setDay(next);
    const value = Number(next);
    if (!Number.isInteger(value) || value < 1 || value > 31) return;
    // El primer cobro pasa a ese día, en su mismo mes (o en el siguiente, si ya pasó).
    const moved = start ? dayOfMonthISO(start, value) : "";
    setStart(moved && moved > today ? moved : nextOccurrence(value, today));
  };
  const changeStart = (next: string) => {
    setStart(next);
    if (next) setDay(String(Number(next.slice(8))));
  };

  const submit = async () => {
    const result = validate(businessBillingSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      const saved = await save.mutateAsync({ businessId, input: result.data });
      toast.success(
        saved.customFee === null
          ? `Mensualidad: ${formatUsdAmount(saved.monthlyFee)}, la de su plan`
          : saved.customFee === 0
            ? "Cortesía: sin cobros"
            : `Precio especial: ${formatUsdAmount(saved.customFee)}`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const pending =
    billing.openCharges > 0 ? (
      <Link to="/admin/billing" className="font-medium text-primary hover:underline">
        {plural(billing.openCharges, "cobro pendiente", "cobros pendientes")}
      </Link>
    ) : null;

  // En Free no hay cobros: ni precio ni día de pago (un precio especial guardado vuelve a valer si pasa a un plan de pago).
  if (plan === "free") {
    return (
      <div className="mt-3 grid content-start gap-2 border-t pt-3">
        <p className="text-sm font-medium">Mensualidad</p>
        <p className="text-xs text-muted-foreground">En el plan Free no hay cobros. {pending}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 grid content-start gap-3 border-t pt-3">
      <p className="text-sm font-medium">Mensualidad</p>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg bg-muted/60 px-3 py-2.5">
        <div className="min-w-0 text-sm">
          {special === null ? (
            <p>
              Mensualidad: <span className="font-semibold tabular-nums">{formatUsdAmount(billing.planPrice)}</span>{" "}
              <span className="text-muted-foreground">({describePlanPrice(plan, billing.agendas)})</span>
            </p>
          ) : (
            <>
              <p>
                Precio especial:{" "}
                <span className="font-semibold tabular-nums">{specialFee === null ? "—" : formatUsdAmount(specialFee)}</span>
                {courtesy && <span className="text-muted-foreground"> (cortesía, sin cobros)</span>}
              </p>
              <p className="text-xs text-muted-foreground">El de su plan: {planLabel}</p>
            </>
          )}
        </div>
        {special === null ? (
          <Button type="button" size="sm" variant="outline" onClick={putSpecial}>
            Poner precio especial
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={removeSpecial}>
            Quitar
          </Button>
        )}
      </div>
      {special !== null && (
        <FormField label="Precio especial (USD)" error={errors.customFee} hint="0: cortesía, sin cobros.">
          {(field) => (
            <Input
              {...field}
              ref={specialInput}
              inputMode="decimal"
              placeholder={String(billing.planPrice).replace(".", ",")}
              value={special}
              onChange={(event) => setSpecial(event.target.value)}
              className="sm:max-w-40"
            />
          )}
        </FormField>
      )}
      {/* En cortesía no hay cobros: el día de pago no importa (se guarda el que había). */}
      {!courtesy && (
        <>
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            <FormField label="Día de pago" error={errors.billingDay} hint="En los meses cortos, el último día.">
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={day}
                  onChange={(event) => changeDay(event.target.value)}
                />
              )}
            </FormField>
            <FormField label="Primer cobro" error={errors.billingStart}>
              {(field) => <Input {...field} type="date" min={today} value={start} onChange={(event) => changeStart(event.target.value)} />}
            </FormField>
          </div>
          {(automatic || day === "") && (
            <p className="text-xs text-muted-foreground">
              {automatic
                ? `Automático: el ${day} de cada mes, el día en que empezó su plan (${formatDate(planStart, "d 'de' MMMM")}). Puedes cambiarlo.`
                : "Se pone solo al guardar: el día en que empezó su plan."}
            </p>
          )}
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {billing.nextDueDate ? `Próximo cobro: ${formatDate(billing.nextDueDate, "d 'de' MMMM 'de' yyyy")}.` : "Sin cobros por ahora."}{" "}
          {pending}
        </p>
        <Button type="button" size="sm" variant="outline" disabled={!changed || save.isPending} onClick={submit}>
          Guardar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Un cambio vale desde el siguiente cobro: los ya creados no cambian.</p>
    </div>
  );
}
