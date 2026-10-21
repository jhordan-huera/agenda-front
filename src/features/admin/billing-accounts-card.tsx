import { Landmark } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { BankAccountsFields } from "@/features/professionals/bank-account-fields";
import { SettingsSection, SettingsSectionSkeleton } from "@/features/settings/settings-section";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { useBillingAccounts, useSetBillingAccounts } from "@/hooks/queries/use-admin";
import { APP_NAME } from "@/lib/constants/app";
import { getErrorMessage } from "@/lib/data";
import { platformBankAccountsSchema } from "@/lib/validations/admin";
import type { BankAccountInput } from "@/lib/validations/payment";
import { validate } from "@/lib/validations/validate";
import type { BankAccount } from "@/types";

const LABELS = {
  title: "Recibir las mensualidades por transferencia",
  description: "El día de pago, el propietario ve estas cuentas y el monto, transfiere a cualquiera y sube el comprobante.",
  seenBy: "el propietario",
};

/**
 * «Cuentas para recibir las mensualidades» (spec 029), en /admin → Configuración: hasta 3, como las de las
 * agendas. Las ven los propietarios en su pantalla de pago y en el email de los tres días antes; nunca van en
 * la configuración pública. Cambiarlas queda en la actividad de la plataforma.
 */
export function BillingAccountsCard() {
  const accounts = useBillingAccounts();
  if (accounts.isPending) return <SettingsSectionSkeleton fields={2} />;
  if (accounts.isError) return <ErrorState onRetry={() => accounts.refetch()} />;
  return <BillingAccountsForm saved={inFormOrder(accounts.data.bankAccounts)} />;
}

function BillingAccountsForm({ saved }: { saved: BankAccountInput[] }) {
  const save = useSetBillingAccounts();
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm({ bankAccounts: saved });
  const setBankAccounts = (bankAccounts: BankAccountInput[]) => {
    setField("bankAccounts", bankAccounts);
    // Los errores de sus campos ("bankAccounts.1.number"…) se corrigen al escribir (y al ordenar o quitar una cuenta).
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith("bankAccounts"))));
  };

  const submit = async () => {
    const result = validate(platformBankAccountsSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      const { bankAccounts } = await save.mutateAsync(result.data);
      reset({ bankAccounts: inFormOrder(bankAccounts) });
      toast.success("Cuentas guardadas");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Cuentas para recibir las mensualidades"
      icon={Landmark}
      description={`Las de ${APP_NAME}: los propietarios las ven el día de pago y en el email de los tres días antes. Nunca salen en las páginas públicas.`}
      dirty={dirty}
      saving={save.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <BankAccountsFields value={values.bankAccounts} onChange={setBankAccounts} errors={errors} defaultHolder={APP_NAME} labels={LABELS} />
    </SettingsSection>
  );
}

/**
 * La base (jsonb) devuelve las claves de cada cuenta en otro orden: con el del formulario, no parece que hay
 * cambios sin guardar.
 */
function inFormOrder(accounts: BankAccount[]): BankAccountInput[] {
  return accounts.map((account) => ({
    bank: account.bank,
    accountType: account.accountType,
    number: account.number,
    holder: account.holder,
    holderId: account.holderId,
  }));
}
