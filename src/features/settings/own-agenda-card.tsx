import { CalendarSync, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/features/auth/use-session";
import { usePermissions } from "@/features/auth/use-permissions";
import { useMultiAgendaAccess } from "@/features/professionals/use-agendas";
import { BankAccountsFields } from "@/features/professionals/bank-account-fields";
import { CalendarInvitesField } from "@/features/professionals/calendar-invites-field";
import { PaymentReminderModeField } from "@/features/professionals/payment-reminder-mode-field";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import {
  useProfessionals,
  useSaveProfessional,
  useSetCalendarInvites,
  useSetPaymentReminderMode,
} from "@/hooks/queries/use-professionals";
import { paymentRemindersOf } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import type { BankAccountInput } from "@/lib/validations/payment";
import { professionalSchema } from "@/lib/validations/professional";
import { validate } from "@/lib/validations/validate";
import type { BankAccount, PaymentReminderMode, Professional } from "@/types";
import { SettingsSection } from "./settings-section";
import { useSettingsForm } from "./use-settings-form";

/**
 * Cuenta individual (Free y Pro): su única agenda se edita aquí, porque no hay sección Profesionales.
 * El nombre y la foto son los del perfil; aquí van la especialidad, el enlace de videollamada, los datos
 * bancarios y las invitaciones de calendario (spec 027). Con varias agendas, quien tiene la suya (también
 * el rol Profesional) sólo ve aquí el interruptor de sus invitaciones de calendario. En un negocio con
 * «Pedir el comprobante de pago» (spec 039), también el modo de los recordatorios de su agenda.
 */
export function OwnAgendaCard() {
  const { session } = useSession();
  const { can } = usePermissions();
  const multiAgenda = useMultiAgendaAccess();
  const { data: professionals = [] } = useProfessionals();
  const own = professionals.find((p) => p.userId === session?.userId);
  const agenda = own ?? (professionals.length === 1 ? professionals[0] : undefined);
  if (multiAgenda === false && can("professionals.manage") && agenda) return <OwnAgendaForm key={agenda.id} agenda={agenda} />;
  if (multiAgenda !== undefined && own) {
    return (
      <>
        <OwnCalendarInvitesCard agenda={own} />
        <OwnPaymentReminderModeCard agenda={own} />
      </>
    );
  }
  return null;
}

/**
 * El modo de los recordatorios del comprobante de la agenda propia, solo (spec 039): se guarda al cambiarlo,
 * como las invitaciones de calendario. Sólo en los negocios con «Pedir el comprobante de pago».
 */
function OwnPaymentReminderModeCard({ agenda }: { agenda: Professional }) {
  const { data: business } = useCurrentBusiness();
  const setMode = useSetPaymentReminderMode();
  if (!paymentRemindersOf(business).enabled) return null;
  const change = async (mode: PaymentReminderMode) => {
    try {
      await setMode.mutateAsync({ professionalId: agenda.id, mode });
      toast.success(mode === "before" ? "Recordatorios antes de la cita" : "Recordatorios después de la cita");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="size-4 text-primary" aria-hidden /> El comprobante de pago de tus citas
        </CardTitle>
        <CardDescription>Cuándo le recordamos a tu paciente que te envíe el comprobante de su transferencia.</CardDescription>
      </CardHeader>
      <CardContent>
        <PaymentReminderModeField
          person="own"
          value={agenda.paymentReminderMode ?? "before"}
          onChange={change}
          disabled={setMode.isPending}
        />
      </CardContent>
    </Card>
  );
}

/** Las invitaciones de calendario de la agenda propia, solas: se guardan al cambiar el interruptor (spec 027). */
function OwnCalendarInvitesCard({ agenda }: { agenda: Professional }) {
  const setCalendarInvites = useSetCalendarInvites();
  const toggle = async (calendarInvites: boolean) => {
    try {
      await setCalendarInvites.mutateAsync({ professionalId: agenda.id, calendarInvites });
      toast.success(calendarInvites ? "Invitaciones de calendario activadas" : "Invitaciones de calendario desactivadas", {
        description: calendarInvites ? `Revisa ${agenda.calendarEmail}: van llegando las de tus próximas citas.` : undefined,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarSync className="size-4 text-primary" aria-hidden /> Tus citas en tu calendario
        </CardTitle>
        <CardDescription>Para verlas en el calendario del celular, del iPad o de la computadora, junto a lo demás de tu día.</CardDescription>
      </CardHeader>
      <CardContent>
        <CalendarInvitesField
          person="own"
          email={agenda.calendarEmail}
          checked={agenda.calendarInvites}
          onCheckedChange={toggle}
          disabled={setCalendarInvites.isPending}
        />
      </CardContent>
    </Card>
  );
}

function OwnAgendaForm({ agenda }: { agenda: Professional }) {
  const save = useSaveProfessional();
  const { data: business } = useCurrentBusiness();
  // El modo de los recordatorios del comprobante (spec 039), sólo con el negocio activado.
  const paymentReminders = paymentRemindersOf(business).enabled;
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm({
    title: agenda.title,
    meetingUrl: agenda.meetingUrl,
    bankAccounts: inFormOrder(agenda.bankAccounts),
    calendarInvites: agenda.calendarInvites,
    paymentReminderMode: agenda.paymentReminderMode ?? ("before" as PaymentReminderMode),
  });
  const setBankAccounts = (bankAccounts: BankAccountInput[]) => {
    setField("bankAccounts", bankAccounts);
    // Los errores de sus campos ("bankAccounts.1.number"…) se corrigen al escribir (y al ordenar o quitar una cuenta).
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith("bankAccounts"))));
  };

  const submit = async () => {
    const { id, businessId: _business, sortOrder: _order, createdAt: _created, calendarEmail, paymentReminderMode: _mode, ...current } = agenda;
    // Sin email no hay invitaciones de calendario: se guardan apagadas. El modo sólo va con el negocio activado.
    const { paymentReminderMode, ...rest } = values;
    const result = validate(professionalSchema, {
      ...current,
      ...rest,
      calendarInvites: values.calendarInvites && Boolean(calendarEmail),
      ...(paymentReminders && { paymentReminderMode }),
    });
    setErrors(result.errors);
    if (!result.success) return;
    try {
      await save.mutateAsync({ id, input: result.data });
      reset({
        title: result.data.title,
        meetingUrl: result.data.meetingUrl,
        bankAccounts: result.data.bankAccounts,
        calendarInvites: result.data.calendarInvites ?? false,
        paymentReminderMode: result.data.paymentReminderMode ?? values.paymentReminderMode,
      });
      toast.success("Agenda actualizada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Tu agenda en la página de reservas"
      description="Tu nombre y tu foto son los de tu perfil. Aquí, lo que ven tus pacientes junto a tu nombre, la sala de tus citas virtuales, tus datos para cobrar por transferencia y tus citas en tu calendario."
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
      <BankAccountsFields value={values.bankAccounts} onChange={setBankAccounts} errors={errors} defaultHolder={agenda.displayName} />
      <CalendarInvitesField
        person="own"
        email={agenda.calendarEmail}
        checked={values.calendarInvites}
        onCheckedChange={(checked) => setField("calendarInvites", checked)}
      />
      {paymentReminders && (
        <PaymentReminderModeField person="own" value={values.paymentReminderMode} onChange={(mode) => setField("paymentReminderMode", mode)} />
      )}
    </SettingsSection>
  );
}

/**
 * La base (jsonb) devuelve las claves de cada cuenta en otro orden: con el del formulario, no parece
 * que hay cambios sin guardar.
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
