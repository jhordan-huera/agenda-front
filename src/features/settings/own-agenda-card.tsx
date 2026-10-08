import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { useSession } from "@/features/auth/use-session";
import { usePermissions } from "@/features/auth/use-permissions";
import { useMultiAgendaAccess } from "@/features/professionals/use-agendas";
import { BankAccountFields } from "@/features/professionals/bank-account-fields";
import { useProfessionals, useSaveProfessional } from "@/hooks/queries/use-professionals";
import { getErrorMessage } from "@/lib/data";
import type { BankAccountInput } from "@/lib/validations/payment";
import { professionalSchema } from "@/lib/validations/professional";
import { validate } from "@/lib/validations/validate";
import type { BankAccount, Professional } from "@/types";
import { SettingsSection } from "./settings-section";
import { useSettingsForm } from "./use-settings-form";

/**
 * Cuenta individual (Free y Pro): su única agenda se edita aquí, porque no hay sección Profesionales.
 * El nombre y la foto son los del perfil; aquí van la especialidad, el enlace de videollamada y los
 * datos bancarios.
 */
export function OwnAgendaCard() {
  const { session } = useSession();
  const { can } = usePermissions();
  const multiAgenda = useMultiAgendaAccess();
  const { data: professionals = [] } = useProfessionals();
  const agenda = professionals.find((p) => p.userId === session?.userId) ?? (professionals.length === 1 ? professionals[0] : undefined);
  if (multiAgenda !== false || !can("professionals.manage") || !agenda) return null;
  return <OwnAgendaForm key={agenda.id} agenda={agenda} />;
}

function OwnAgendaForm({ agenda }: { agenda: Professional }) {
  const save = useSaveProfessional();
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm({
    title: agenda.title,
    meetingUrl: agenda.meetingUrl,
    bankAccount: inFormOrder(agenda.bankAccount),
  });
  const setBankAccount = (bankAccount: BankAccountInput | null) => {
    setField("bankAccount", bankAccount);
    // Los errores de sus campos ("bankAccount.number"…) se corrigen al escribir.
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith("bankAccount."))));
  };

  const submit = async () => {
    const { id, businessId: _business, sortOrder: _order, createdAt: _created, ...current } = agenda;
    const result = validate(professionalSchema, { ...current, ...values });
    setErrors(result.errors);
    if (!result.success) return;
    try {
      await save.mutateAsync({ id, input: result.data });
      reset({ title: result.data.title, meetingUrl: result.data.meetingUrl, bankAccount: result.data.bankAccount });
      toast.success("Agenda actualizada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Tu agenda en la página de reservas"
      description="Tu nombre y tu foto son los de tu perfil. Aquí, lo que ven tus pacientes junto a tu nombre, la sala de tus citas virtuales y tus datos para cobrar por transferencia."
      dirty={dirty}
      saving={save.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <FormField label="Especialidad" optional error={errors.title} hint="Sale junto a tu nombre: p. ej. Psicóloga clínica.">
        {(field) => <Input {...field} value={values.title} onChange={(e) => setField("title", e.target.value)} />}
      </FormField>
      <FormField
        label="Enlace de videollamada"
        optional
        error={errors.meetingUrl}
        hint="Tu sala fija de Google Meet, Zoom o Teams. Se envía al paciente en las citas virtuales."
      >
        {(field) => (
          <Input
            {...field}
            type="url"
            inputMode="url"
            placeholder="https://meet.google.com/abc-defg-hij"
            value={values.meetingUrl}
            onChange={(e) => setField("meetingUrl", e.target.value)}
          />
        )}
      </FormField>
      <BankAccountFields value={values.bankAccount} onChange={setBankAccount} errors={errors} defaultHolder={agenda.displayName} />
    </SettingsSection>
  );
}

/** La base devuelve las claves en otro orden: así no parece que hay cambios sin guardar. */
function inFormOrder(account: BankAccount | null): BankAccountInput | null {
  return account && { bank: account.bank, accountType: account.accountType, number: account.number, holder: account.holder, holderId: account.holderId };
}
