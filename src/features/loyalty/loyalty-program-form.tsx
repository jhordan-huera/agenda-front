import { Check } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SettingsSection } from "@/features/settings/settings-section";
import { SwitchField } from "@/features/settings/switch-field";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { useSaveLoyaltyProgram } from "@/hooks/queries/use-loyalty";
import { STAMP_ICONS } from "@/lib/constants/loyalty";
import { getErrorMessage } from "@/lib/data";
import { formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { loyaltyProgramSchema } from "@/lib/validations/loyalty";
import { validate } from "@/lib/validations/validate";
import type { Business, LoyaltyAfterLast, LoyaltyProgram, StampIcon as StampIconName } from "@/types";
import { StampIcon } from "./stamp-icon";

const AFTER_LAST: { value: LoyaltyAfterLast; label: string; description: string }[] = [
  {
    value: "keep",
    label: "Seguir sumando",
    description: "La tarjeta se queda llena: sigue sumando sellos, sin más premios.",
  },
  {
    value: "restart",
    label: "Empezar una tarjeta nueva",
    description: "Al ganar el último premio sube de nivel y empieza de cero: Clásica (la primera), Plata (la segunda) y Oro (de la tercera en adelante). Lo ganado se conserva.",
  },
];

interface ProgramValues {
  enabled: boolean;
  name: string;
  description: string;
  stampIcon: StampIconName;
  afterLast: LoyaltyAfterLast;
}

const valuesOf = (program: LoyaltyProgram): ProgramValues => ({
  enabled: program.enabled,
  name: program.name,
  description: program.description,
  stampIcon: program.stampIcon,
  afterLast: program.afterLast,
});

/**
 * «Programa» de Fidelización (spec 052): encenderla o apagarla, el nombre, la descripción, el sello de cada casilla
 * y qué pasa al llegar al último beneficio. Todo queda en la actividad.
 */
export function LoyaltyProgramForm({ program, business, benefitCount }: { program: LoyaltyProgram; business: Business; benefitCount: number }) {
  const save = useSaveLoyaltyProgram();
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm(valuesOf(program));

  const submit = async () => {
    const result = validate(loyaltyProgramSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      const saved = await save.mutateAsync(result.data);
      reset(valuesOf(saved));
      toast.success(
        saved.enabled && !program.enabled ? "Tarjeta encendida" : !saved.enabled && program.enabled ? "Tarjeta apagada" : "Cambios guardados",
        { description: saved.enabled && !program.enabled ? "Suman las citas atendidas desde ahora." : undefined },
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const enabledText = program.enabled
    ? program.enabledAt
      ? `Encendida desde el ${formatDayMonth(program.enabledAt, business.timezone)}: cada cita atendida suma un sello.`
      : "Encendida: cada cita atendida suma un sello."
    : "Al encenderla, suman las citas atendidas desde ese momento (el historial no cuenta). Si la apagas, no suma sellos, y lo ganado se conserva.";

  return (
    <SettingsSection
      title="Programa"
      description="Cómo se llama tu tarjeta, qué sello lleva y qué pasa cuando el paciente la completa."
      dirty={dirty}
      saving={save.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <SwitchField label="Tarjeta encendida" description={enabledText} checked={values.enabled} onCheckedChange={(enabled) => setField("enabled", enabled)}>
        {values.enabled && benefitCount === 0 && (
          <p className="text-xs text-muted-foreground">Todavía no tienes beneficios activos: agrégalos en «Beneficios» para que se puedan ganar premios.</p>
        )}
      </SwitchField>
      <FormField label="Nombre del programa" error={errors.name} hint="Lo ve el paciente en su tarjeta, por ejemplo «Club Sonrisa».">
        {(field) => <Input {...field} maxLength={60} value={values.name} onChange={(event) => setField("name", event.target.value)} />}
      </FormField>
      <FormField label="Descripción" error={errors.description} optional>
        {(field) => (
          <Textarea
            {...field}
            rows={2}
            maxLength={300}
            placeholder="Ej.: Suma un sello en cada cita y gana premios."
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
          />
        )}
      </FormField>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Sello</legend>
        <div role="radiogroup" aria-label="Sello" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {STAMP_ICONS.map((icon) => {
            const checked = values.stampIcon === icon.value;
            return (
              <button
                key={icon.value}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setField("stampIcon", icon.value)}
                className={cn(
                  "flex min-h-18 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  checked && "border-primary bg-accent hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full",
                    checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  <StampIcon icon={icon.value} className="size-4" />
                </span>
                {icon.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Se dibuja en cada casilla ganada de la tarjeta.</p>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Al llegar al último beneficio</legend>
        <div role="radiogroup" aria-label="Al llegar al último beneficio" className="grid gap-2 sm:grid-cols-2">
          {AFTER_LAST.map((option) => {
            const checked = values.afterLast === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setField("afterLast", option.value)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
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
                  <span className="block font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </SettingsSection>
  );
}

/** Con la tarjeta apagada: qué es y cómo se enciende. */
export function LoyaltyIntro() {
  return (
    <section aria-labelledby="loyalty-intro-title" className="rounded-xl border border-dashed bg-background p-4 sm:p-5">
      <h2 id="loyalty-intro-title" className="font-semibold">
        Tu tarjeta de sellos, sin cartón
      </h2>
      <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
        <li className="rounded-lg bg-muted/60 p-3">
          <span className="font-medium text-foreground">Cada cita atendida suma un sello</span> a cada paciente de la cita.
        </li>
        <li className="rounded-lg bg-muted/60 p-3">
          <span className="font-medium text-foreground">Al llegar a las citas de un beneficio,</span> gana su premio con un código
          para canjearlo.
        </li>
        <li className="rounded-lg bg-muted/60 p-3">
          <span className="font-medium text-foreground">El paciente la ve en su celular</span> si crea su cuenta y escaneas su QR
          en la cita.
        </li>
      </ul>
      <p className="mt-3 text-sm">
        Para encenderla: ponle nombre, elige el sello, agrega tus beneficios y enciende «Tarjeta encendida». Empieza apagada.
      </p>
    </section>
  );
}
