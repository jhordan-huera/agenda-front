import { BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { SettingsSection, SettingsSectionSkeleton } from "@/features/settings/settings-section";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { usePlanPrices, useSetPlanPrices } from "@/hooks/queries/use-admin";
import { formatUsdAmount } from "@/lib/constants/business";
import { planMonthlyPrice } from "@/lib/constants/plans";
import { getErrorMessage } from "@/lib/data";
import { planPricesSchema } from "@/lib/validations/admin";
import { validate } from "@/lib/validations/validate";
import type { PlanPrices } from "@/types";

/** Lo que se escribe en el formulario: los montos con coma («14,99»), como los dice la aplicación. */
type PlanPricesForm = Record<keyof PlanPrices, string>;

const toForm = (prices: PlanPrices): PlanPricesForm => ({
  proPrice: prices.proPrice.toFixed(2).replace(".", ","),
  businessPrice: prices.businessPrice.toFixed(2).replace(".", ","),
  businessIncludedAgendas: String(prices.businessIncludedAgendas),
  businessExtraAgendaPrice: prices.businessExtraAgendaPrice.toFixed(2).replace(".", ","),
});

/** Lo escrito, con punto decimal, para validarlo. */
const toInput = (form: PlanPricesForm) => ({
  proPrice: form.proPrice.trim().replace(",", "."),
  businessPrice: form.businessPrice.trim().replace(",", "."),
  businessIncludedAgendas: form.businessIncludedAgendas.trim(),
  businessExtraAgendaPrice: form.businessExtraAgendaPrice.trim().replace(",", "."),
});

/**
 * «Precios de las mensualidades» (spec 029, ampliación del 2026-10-20), en /admin → Planes: Pro, Business con
 * sus agendas incluidas y lo que suma cada agenda más, con el ejemplo calculado mientras se escribe. Valen
 * desde el siguiente cobro de cada negocio (los ya creados no cambian) y quedan en la actividad. Los negocios
 * nunca los ven: el propietario sólo ve su total.
 */
export function PlanPricesCard() {
  const prices = usePlanPrices();
  if (prices.isPending) return <SettingsSectionSkeleton fields={4} />;
  if (prices.isError) return <ErrorState onRetry={() => prices.refetch()} />;
  return <PlanPricesForm saved={toForm(prices.data)} />;
}

function PlanPricesForm({ saved }: { saved: PlanPricesForm }) {
  const save = useSetPlanPrices();
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm(saved);
  // El ejemplo, con lo escrito: si algo todavía no es válido, no se calcula.
  const parsed = planPricesSchema.safeParse(toInput(values));
  const example = (agendas: number) => (parsed.success ? formatUsdAmount(planMonthlyPrice("business", agendas, parsed.data)) : "—");
  const included = parsed.success ? parsed.data.businessIncludedAgendas : Number(saved.businessIncludedAgendas);

  const submit = async () => {
    const result = validate(planPricesSchema, toInput(values));
    setErrors(result.errors);
    if (!result.success) return;
    try {
      reset(toForm(await save.mutateAsync(result.data)));
      toast.success("Precios guardados: valen desde el siguiente cobro");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const money = (key: "proPrice" | "businessPrice" | "businessExtraAgendaPrice", label: string, hint?: string) => (
    <FormField label={label} error={errors[key]} hint={hint}>
      {(field) => <Input {...field} inputMode="decimal" value={values[key]} onChange={(event) => setField(key, event.target.value)} />}
    </FormField>
  );

  return (
    <SettingsSection
      title="Precios de las mensualidades"
      icon={BadgeDollarSign}
      description="La mensualidad de cada negocio sale de su plan y sus agendas. Un cambio vale desde el siguiente cobro: los ya creados no cambian. Los negocios nunca ven estos precios, sólo su total."
      dirty={dirty}
      saving={save.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {money("proPrice", "Pro (USD)")}
        {money("businessPrice", "Business (USD)", "Con sus agendas incluidas.")}
        <FormField label="Agendas incluidas en Business" error={errors.businessIncludedAgendas}>
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={values.businessIncludedAgendas}
              onChange={(event) => setField("businessIncludedAgendas", event.target.value)}
            />
          )}
        </FormField>
        {money("businessExtraAgendaPrice", "Cada agenda más (USD)")}
      </div>
      <div className="rounded-lg bg-muted/60 p-3 text-sm">
        <p className="font-medium">Ejemplo de Business</p>
        <dl className="mt-2 grid grid-cols-3 gap-2">
          {[included, included + 1, included + 2].map((agendas) => (
            <div key={agendas}>
              <dt className="text-xs text-muted-foreground">{agendas === 1 ? "1 agenda" : `${agendas} agendas`}</dt>
              <dd className="font-semibold tabular-nums">{example(agendas)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          Se cuentan las agendas contratadas de cada negocio; sin tope, las activas. Free no tiene cobros, y en la ficha de un negocio le
          puedes poner un precio especial.
        </p>
      </div>
    </SettingsSection>
  );
}
