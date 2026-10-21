import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSetBusinessBilling } from "@/hooks/queries/use-admin";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { formatUsdAmount } from "@/lib/constants/business";
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
  /** La zona del negocio: de ella salen «hoy» y el día propuesto. */
  timezone: string;
}

/** El primer día de pago después de hoy: el de este mes si todavía no llegó; si no, el del mes siguiente. */
function nextOccurrence(day: number, today: ISODate): ISODate {
  const thisMonth = dayOfMonthISO(today, day);
  return thisMonth > today ? thisMonth : dayOfMonthISO(addMonthsISO(today, 1), day);
}

const todayIn = (timezone: string) => {
  try {
    return getZonedNow(timezone).date;
  } catch {
    return getZonedNow(DEFAULT_TIMEZONE).date;
  }
};

/**
 * La mensualidad del negocio (spec 029), en «Suscripción y uso»: el monto en dólares (0: sin cobros), el día
 * de pago y la fecha del primer cobro. Al poner la primera mensualidad se propone el día de hoy, con el primer
 * cobro al cumplirse el mes; elegir otra fecha cambia el día de pago, y otro día mueve la fecha a ese día.
 * Queda en la actividad de la plataforma; el propietario la ve en su configuración.
 */
export function BusinessBillingFields({ businessId, billing, plan, timezone }: BusinessBillingFieldsProps) {
  const save = useSetBusinessBilling();
  const today = todayIn(timezone);
  const [fee, setFee] = useState(billing.monthlyFee > 0 ? String(billing.monthlyFee) : "");
  const [day, setDay] = useState(billing.billingDay === null ? "" : String(billing.billingDay));
  const [start, setStart] = useState(billing.billingStart ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const values = {
    monthlyFee: fee.trim() === "" ? 0 : Number(fee.replace(",", ".")),
    billingDay: day.trim() === "" ? null : Number(day),
    billingStart: start === "" ? null : start,
  };
  const changed =
    values.monthlyFee !== billing.monthlyFee || values.billingDay !== billing.billingDay || values.billingStart !== billing.billingStart;

  const changeFee = (next: string) => {
    setFee(next);
    // La primera mensualidad: se propone el día de hoy, con el primer cobro al cumplirse el mes.
    if (day === "" && start === "" && next.trim() !== "" && Number(next.replace(",", ".")) > 0) {
      const proposed = Number(today.slice(8));
      setDay(String(proposed));
      setStart(nextOccurrence(proposed, today));
    }
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
      toast.success(saved.monthlyFee > 0 ? `Mensualidad: ${formatUsdAmount(saved.monthlyFee)}` : "Sin mensualidad: ya no se le cobra");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="mt-3 grid content-start gap-3 border-t pt-3">
      <p className="text-sm font-medium">Mensualidad</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Monto (USD)" error={errors.monthlyFee} hint="0 o vacío: sin cobros.">
          {(field) => (
            <Input
              {...field}
              inputMode="decimal"
              placeholder="9,99"
              value={fee}
              onChange={(event) => changeFee(event.target.value)}
            />
          )}
        </FormField>
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
        <FormField label="Primer cobro" error={errors.billingStart} className="sm:col-span-2">
          {(field) => <Input {...field} type="date" min={today} value={start} onChange={(event) => changeStart(event.target.value)} />}
        </FormField>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {plan === "free"
            ? "En el plan Free no hay cobros."
            : billing.nextDueDate
              ? `Próximo cobro: ${formatDate(billing.nextDueDate, "d 'de' MMMM 'de' yyyy")}.`
              : "Sin cobros por ahora."}{" "}
          {billing.openCharges > 0 && (
            <Link to="/admin/billing" className="font-medium text-primary hover:underline">
              {plural(billing.openCharges, "cobro pendiente", "cobros pendientes")}
            </Link>
          )}
        </p>
        <Button type="button" size="sm" variant="outline" disabled={!changed || save.isPending} onClick={submit}>
          Guardar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Un cambio vale desde el siguiente cobro: los ya creados no cambian.</p>
    </div>
  );
}
