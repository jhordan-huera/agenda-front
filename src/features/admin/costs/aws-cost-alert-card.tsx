import { BellRing } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { useSetAwsCostAlert } from "@/hooks/queries/use-admin";
import { formatUsdAmount } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import { awsCostAlertSchema } from "@/lib/validations/admin";
import { validate } from "@/lib/validations/validate";
import type { AwsCosts } from "@/types";

/** El monto como se escribe en el formulario: con coma («1,50»); vacío, sin aviso. */
const toText = (amount: number | null) => (amount === null ? "" : amount.toFixed(2).replace(".", ","));

/**
 * «Aviso de gasto» (spec 031): el monto en dólares que, al pasarlo lo gastado en el mes, manda un ntfy y un
 * email al super admin principal, una vez por mes y por monto. «Guardar» y «Quitar aviso», como los precios de
 * los planes; cada cambio queda en la actividad. Cambiar el monto vuelve a dejar el aviso disponible este mes.
 */
export function AwsCostAlertCard({ costs, className }: { costs: AwsCosts; className?: string }) {
  // Con otro monto guardado, el formulario empieza de nuevo con él.
  return <AlertForm key={String(costs.alertAmount)} saved={costs.alertAmount} alerted={costs.alertedThisMonth} className={className} />;
}

function AlertForm({ saved, alerted, className }: { saved: number | null; alerted: boolean; className?: string }) {
  const save = useSetAwsCostAlert();
  const [removing, setRemoving] = useState(false);
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm({ amount: toText(saved) });

  const apply = async (amount: number | null) => {
    const next = await save.mutateAsync({ amount });
    reset({ amount: toText(next.alertAmount) });
    toast.success(
      next.alertAmount === null ? "Aviso quitado: no te llegarán avisos de gasto" : `Aviso guardado: te avisamos cuando pases de ${formatUsdAmount(next.alertAmount)}`,
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || save.isPending) return;
    const text = values.amount.trim();
    const result = validate(awsCostAlertSchema, { amount: text === "" ? null : text.replace(",", ".") });
    setErrors(result.errors);
    if (!result.success) return;
    try {
      await apply(result.data.amount);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await apply(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card className={className}>
      {/* `contents`: el formulario no rompe el layout flex de la tarjeta. */}
      <form onSubmit={submit} noValidate className="contents">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <CardTitleIcon icon={BellRing} /> Aviso de gasto
          </CardTitle>
          <CardDescription>Cuando lo gastado en el mes pase de este monto, te llegan un ntfy y un email al super admin principal, una vez al mes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField label="Monto del aviso (USD)" error={errors.amount} hint="Vacío: sin avisos. Un monto nuevo vuelve a activar el aviso este mes.">
            {(field) => (
              <Input
                {...field}
                inputMode="decimal"
                autoComplete="off"
                placeholder="Por ejemplo, 1,00"
                value={values.amount}
                onChange={(event) => setField("amount", event.target.value)}
              />
            )}
          </FormField>
          {saved !== null && (
            <p className="text-sm text-muted-foreground">
              {alerted ? `Ya te avisamos este mes con ${formatUsdAmount(saved)}.` : `Activo: te avisamos cuando pases de ${formatUsdAmount(saved)}.`}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-auto flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {dirty && (
            <p className="text-center text-xs text-muted-foreground sm:mr-auto sm:text-left" role="status">
              Sin guardar
            </p>
          )}
          {saved !== null && (
            <Button type="button" variant="ghost" disabled={save.isPending} onClick={remove}>
              {removing ? "Quitando…" : "Quitar aviso"}
            </Button>
          )}
          <SubmitButton disabled={!dirty} loading={save.isPending && !removing} loadingText="Guardando…">
            Guardar
          </SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
