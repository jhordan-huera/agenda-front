import { Video } from "lucide-react";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clearHomeVisitErrors, EMPTY_HOME_VISIT, getPlace } from "@/features/appointments/appointment-utils";
import { HomeVisitFields } from "@/features/appointments/home-visit-fields";
import { MODE_ICONS } from "@/features/services/mode-icons";
import { documentIdError, documentIdMaxLength, normalizeDocumentId, onlyDigits } from "@/lib/identity";
import { formatCurrency, isPriceVisible } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { publicBookingSchema, type PublicBookingInput } from "@/lib/validations/booking";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { HomeVisitAddress, PublicBusiness, PublicService, ServiceMode } from "@/types";
import type { ContactValues } from "./contact";
import { forgetSavedContact } from "./saved-contact";

interface DetailsStepProps {
  selection: Pick<PublicBookingInput, "serviceId" | "date" | "startTime">;
  service: PublicService;
  business: PublicBusiness;
  /**
   * Datos del paso. Viven en el flujo y se guardan con cada cambio: no se pierden al volver atrás
   * ni si la hora elegida deja de estar disponible (y el paso se desmonta).
   */
  contact: ContactValues;
  onContactChange: Dispatch<SetStateAction<ContactValues>>;
  /** Devuelve la reserva ya validada. */
  onContinue: (input: PublicBookingInput) => void;
}

/**
 * El lugar según el servicio: el que ya había elegido, si el servicio lo admite; si no, la primera
 * modalidad del servicio (el domicilio que deja de usarse se guarda para recuperarlo).
 */
function withServicePlace(service: PublicService, current: ContactValues): ContactValues {
  if (service.modes.includes(getPlace(current))) return current;
  const place = service.modes[0];
  return {
    ...current,
    homeVisit: place === "home" ? (current.homeVisit ?? current.lastHomeVisit ?? EMPTY_HOME_VISIT) : null,
    isVirtual: place === "virtual",
    lastHomeVisit: current.homeVisit ?? current.lastHomeVisit,
  };
}

/**
 * Datos del paciente: siempre cédula, nombre, email y teléfono. La página no dice si ya es cliente
 * del negocio; si lo es, la reserva se une a su ficha cuando coinciden el email o el teléfono.
 */
export function DetailsStep({ selection, service, business, contact, onContactChange, onContinue }: DetailsStepProps) {
  const values = withServicePlace(service, contact);
  const setValues = (update: (current: ContactValues) => ContactValues) =>
    onContactChange((current) => update(withServicePlace(service, current)));
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (key: "documentId" | "name" | "email" | "phone" | "notes") => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const forgetData = () => {
    forgetSavedContact();
    setValues((current) => ({ ...current, documentId: "", name: "", email: "", phone: "", fromSaved: false }));
    setErrors({});
  };
  const updateHomeVisit = (patch: Partial<HomeVisitAddress>) => {
    setValues((current) => ({ ...current, homeVisit: { ...(current.homeVisit ?? EMPTY_HOME_VISIT), ...patch } }));
    setErrors((current) => clearHomeVisitErrors(current, patch));
  };
  // Si el cliente cambia a "en el local" (o virtual) y vuelve, recupera lo que ya había marcado.
  const choosePlace = (place: ServiceMode) =>
    setValues((current) => ({
      ...current,
      homeVisit: place === "home" ? (current.homeVisit ?? current.lastHomeVisit ?? EMPTY_HOME_VISIT) : null,
      isVirtual: place === "virtual",
      lastHomeVisit: current.homeVisit ?? current.lastHomeVisit,
    }));
  // Sin cédula ecuatoriana (p. ej. un extranjero) no puede reservar online: se le ofrece escribir al negocio.
  const showNoCedulaHelp =
    Boolean(errors.documentId) && documentIdError(normalizeDocumentId(values.documentId), business.timezone) !== null;
  const noCedulaUrl = business.phone
    ? getWhatsAppUrl(
        business.phone,
        business.timezone,
        `Hola, quisiera agendar una cita en ${business.name}, pero no tengo cédula ecuatoriana.`,
      )
    : null;
  const placeOptions: Record<ServiceMode, { title: string; detail: string }> = {
    business: { title: `En ${business.name}`, detail: business.address || "En el local del negocio" },
    home: {
      title: "A domicilio",
      detail:
        service.homeVisitFee && isPriceVisible(service)
          ? `Vamos a tu casa · +${formatCurrency(service.homeVisitFee, business.currency)}`
          : "Vamos a tu casa",
    },
    virtual: { title: "Virtual", detail: "Por videollamada, desde donde estés" },
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validate(publicBookingSchema, { ...selection, ...values });
    // La cédula de un negocio de Ecuador, además, debe ser válida (dígito verificador).
    const documentError = result.errors.documentId ? null : documentIdError(normalizeDocumentId(values.documentId), business.timezone);
    setErrors({ ...result.errors, ...(documentError ? { documentId: documentError } : {}) });
    if (result.success && !documentError) onContinue(result.data);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {values.fromSaved && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <span>Usamos los datos que guardaste en este dispositivo.</span>
          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-ink" onClick={forgetData}>
            Olvidar mis datos
          </Button>
        </div>
      )}
      <FormField label="Número de cédula" error={errors.documentId} hint="Sólo números, sin guiones.">
        {(field) => (
          <Input
            {...field}
            inputMode="numeric"
            autoComplete="off"
            maxLength={documentIdMaxLength(business.timezone)}
            className="h-10"
            placeholder="Ej.: 1712345678"
            value={values.documentId}
            onChange={(e) => set("documentId")(onlyDigits(e.target.value))}
          />
        )}
      </FormField>
      {showNoCedulaHelp && (
        <p className="-mt-2 text-xs text-muted-foreground">
          ¿No tienes cédula ecuatoriana?{" "}
          {noCedulaUrl ? (
            <a
              href={noCedulaUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-ink underline underline-offset-4 outline-none hover:decoration-2 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Escríbenos por WhatsApp
            </a>
          ) : (
            `Comunícate con ${business.name} para agendar tu cita.`
          )}
        </p>
      )}
      <FormField label="Nombre completo" error={errors.name}>
        {(field) => (
          <Input {...field} autoComplete="name" className="h-10" value={values.name} onChange={(e) => set("name")(e.target.value)} />
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" error={errors.email}>
          {(field) => (
            <Input
              {...field}
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              className="h-10"
              value={values.email}
              onChange={(e) => set("email")(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Teléfono" error={errors.phone}>
          {(field) => (
            <Input
              {...field}
              type="tel"
              autoComplete="tel"
              placeholder="+593 99 123 4567"
              className="h-10"
              value={values.phone}
              onChange={(e) => set("phone")(e.target.value)}
            />
          )}
        </FormField>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Si ya te atendieron aquí, usa el email o el teléfono que le diste a {business.name}.
      </p>

      {service.modes.length > 1 && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">¿Cómo quieres tu cita?</legend>
          <div
            role="radiogroup"
            aria-label="Lugar de la cita"
            className={cn("grid gap-2 sm:grid-cols-2", service.modes.length === 3 && "lg:grid-cols-3")}
          >
            {service.modes.map((mode) => {
              const option = { ...placeOptions[mode], icon: MODE_ICONS[mode] };
              const selected = getPlace(values) === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choosePlace(mode)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected && "border-primary bg-accent hover:bg-accent",
                  )}
                >
                  <option.icon className={cn("mt-0.5 size-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} aria-hidden />
                  <span>
                    <span className="block font-medium">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">{option.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {values.isVirtual && (
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <Video className="mt-0.5 size-4 shrink-0" aria-hidden />
          Es por videollamada: el enlace para entrar te llega con la confirmación.
        </p>
      )}
      {values.homeVisit && (
        <section aria-labelledby="home-visit-heading" className="grid gap-3 rounded-xl border bg-muted/30 p-4">
          <div>
            <h3 id="home-visit-heading" className="text-sm font-medium">
              ¿Dónde te visitamos?
            </h3>
            <p className="text-xs text-muted-foreground">Marca en el mapa el lugar exacto para que el profesional llegue sin problemas.</p>
          </div>
          <HomeVisitFields
            value={values.homeVisit}
            onChange={updateHomeVisit}
            errors={errors}
            timezone={business.timezone}
            centerOnAddress={business.address || undefined}
            mapRequired
          />
        </section>
      )}
      <FormField label="Nota para el profesional" error={errors.notes} optional>
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            placeholder="Motivo de la consulta, preferencias…"
            value={values.notes}
            onChange={(e) => set("notes")(e.target.value)}
          />
        )}
      </FormField>
      <div className="flex items-center gap-2">
        <Checkbox
          id="remember-contact"
          checked={values.remember}
          onCheckedChange={(checked) => setValues((current) => ({ ...current, remember: checked === true }))}
        />
        <Label htmlFor="remember-contact" className="font-normal">
          Recordar mis datos en este dispositivo
        </Label>
      </div>
      <Button type="submit" size="lg" className="h-11 text-sm">
        Continuar
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Usaremos tus datos sólo para gestionar esta cita. No necesitas crear una cuenta.
      </p>
    </form>
  );
}
