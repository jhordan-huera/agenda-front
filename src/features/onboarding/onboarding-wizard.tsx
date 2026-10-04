import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/features/auth/use-session";
import { validateWeek } from "@/features/schedule/schedule-utils";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { useCategories } from "@/hooks/queries/use-categories";
import { DEFAULT_WEEKLY_SCHEDULE } from "@/lib/constants/business";
import { data, getErrorMessage } from "@/lib/data";
import { onboardingSchema } from "@/lib/validations/business";
import { requiredText } from "@/lib/validations/fields";
import { serviceSchema } from "@/lib/validations/service";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { BusinessCategoryInfo } from "@/types";
import {
  BasicInfoStep,
  BusinessNameStep,
  CategoryStep,
  FirstServiceStep,
  ScheduleStep,
  SummaryStep,
  type FirstServiceValues,
  type OnboardingValues,
} from "./onboarding-steps";

const STEPS = [
  { title: "¿Cómo se llama tu negocio?", description: "Puedes cambiarlo más adelante." },
  { title: "¿Qué tipo de negocio tienes?", description: "Nos ayuda a sugerirte la mejor configuración." },
  { title: "Información básica", description: "Datos de contacto que verán tus clientes al reservar." },
  { title: "¿Cuál es tu horario de atención?", description: "Puedes añadir varios intervalos por día (p. ej. mañana y tarde)." },
  { title: "Crea tu primer servicio", description: "Con su duración calculamos las horas disponibles para reservar." },
  { title: "¡Todo listo!", description: "Revisa la configuración y crea tu negocio." },
];

/** Servicio sugerido por la categoría (o uno genérico mientras no hay categoría). */
const DEFAULT_SUGGESTION: BusinessCategoryInfo["suggestedService"] = { name: "Consulta", durationMinutes: 60, price: 25 };

const suggestedService = (suggestion: BusinessCategoryInfo["suggestedService"] = DEFAULT_SUGGESTION): FirstServiceValues => {
  return {
    name: suggestion.name,
    description: "",
    durationMinutes: String(suggestion.durationMinutes),
    price: String(suggestion.price),
    isActive: true,
  };
};

/** Semana completa (lunes → domingo) con copias independientes de los intervalos. */
const initialWeek = () => DEFAULT_WEEKLY_SCHEDULE.map((day) => ({ ...day, intervals: day.intervals.map((i) => ({ ...i })) }));

export function OnboardingWizard({ firstName }: { firstName?: string }) {
  const { refresh } = useSession();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<OnboardingValues>(() => ({
    name: "",
    category: "",
    timezone: DEFAULT_TIMEZONE,
    phone: "",
    email: "",
    address: "",
    description: "",
    schedules: initialWeek(),
    service: suggestedService(),
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [scheduleErrors, setScheduleErrors] = useState<Record<number, string>>({});
  const [serviceTouched, setServiceTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const { find: findCategory } = useCategories();

  const onChange = (patch: Partial<OnboardingValues>) => {
    if (patch.service) setServiceTouched(true);
    // Mientras no edite el servicio, se sugiere uno acorde al tipo de negocio.
    if (patch.category && !serviceTouched) {
      patch = { ...patch, service: suggestedService(findCategory(patch.category)?.suggestedService) };
    }
    setValues((current) => ({ ...current, ...patch }));
  };

  const validateStep = (): boolean => {
    setErrors({});
    if (step === 0) {
      const result = requiredText("El nombre del negocio").safeParse(values.name);
      if (!result.success) return setErrors({ name: result.error.issues[0].message }), false;
    }
    if (step === 1 && !values.category) return setErrors({ category: "Selecciona el tipo de negocio" }), false;
    if (step === 2) {
      const result = validate(onboardingSchema.pick({ phone: true, email: true, address: true, description: true, timezone: true }), values);
      setErrors(result.errors);
      if (!result.success) return false;
    }
    if (step === 3) {
      const weekErrors = validateWeek(values.schedules);
      setScheduleErrors(weekErrors);
      if (Object.keys(weekErrors).length > 0) return false;
      if (!values.schedules.some((day) => day.isActive)) {
        toast.error("Activa al menos un día de atención.");
        return false;
      }
    }
    if (step === 4) {
      const result = validate(serviceSchema, values.service);
      setErrors(result.errors);
      if (!result.success) return false;
    }
    return true;
  };

  const next = () => validateStep() && setStep((current) => current + 1);

  const finish = async () => {
    const business = onboardingSchema.safeParse(values);
    const service = serviceSchema.safeParse(values.service);
    if (!business.success || !service.success) return;
    setPending(true);
    try {
      await data.businesses.create({ ...business.data, schedules: values.schedules, firstService: service.data });
      toast.success("¡Tu negocio está listo!");
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setPending(false);
    }
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary">
            {firstName ? `¡Hola, ${firstName}! ` : ""}Paso {step + 1} de {STEPS.length}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} aria-label="Progreso de la configuración" />
      </div>

      <Card className="gap-6 p-6 sm:p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{current.title}</h1>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isLast) finish();
            else next();
          }}
          noValidate
          className="space-y-8"
        >
          {step === 0 && <BusinessNameStep values={values} onChange={onChange} errors={errors} />}
          {step === 1 && <CategoryStep values={values} onChange={onChange} errors={errors} />}
          {step === 2 && <BasicInfoStep values={values} onChange={onChange} errors={errors} />}
          {step === 3 && <ScheduleStep values={values} onChange={onChange} errors={scheduleErrors} />}
          {step === 4 && <FirstServiceStep values={values} onChange={onChange} errors={errors} />}
          {step === 5 && <SummaryStep values={values} />}

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0 || pending}
              className={step === 0 ? "invisible" : undefined}
            >
              <ArrowLeft /> Atrás
            </Button>
            {isLast ? (
              <SubmitButton size="lg" className="h-10 px-4" loading={pending} loadingText="Creando negocio…">
                Crear mi negocio <ArrowRight />
              </SubmitButton>
            ) : (
              <Button type="submit" size="lg" className="h-10 px-4">
                Continuar <ArrowRight />
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
