import { ArrowRight, Home, Search, Store, UserCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { clearHomeVisitErrors, EMPTY_HOME_VISIT } from "@/features/appointments/appointment-utils";
import { HomeVisitFields } from "@/features/appointments/home-visit-fields";
import { useLookupClient } from "@/hooks/queries/use-public-booking";
import { getErrorMessage } from "@/lib/data";
import { documentIdError, documentIdMaxLength, normalizeDocumentId, onlyDigits } from "@/lib/identity";
import { formatCurrency, isPriceVisible } from "@/lib/format";
import { cn } from "@/lib/utils";
import { clientLookupSchema, newClientContactSchema, publicBookingSchema, type PublicBookingInput } from "@/lib/validations/booking";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { Business, HomeVisitAddress, Service } from "@/types";
import type { ContactValues } from "./contact";

interface DetailsStepProps {
  slug: string;
  selection: Pick<PublicBookingInput, "serviceId" | "date" | "startTime">;
  service: Service;
  business: Business;
  initialValues: ContactValues;
  /** Devuelve la reserva y los datos del paso, que se conservan si el cliente vuelve atrás. */
  onContinue: (input: PublicBookingInput, values: ContactValues) => void;
}

/** El lugar inicial respeta lo que admite el servicio. */
function initialHomeVisit(service: Service, current: HomeVisitAddress | null): HomeVisitAddress | null {
  if (service.location === "business") return null;
  if (service.location === "home") return current ?? EMPTY_HOME_VISIT;
  return current;
}

export function DetailsStep({ slug, selection, service, business, initialValues, onContinue }: DetailsStepProps) {
  const lookup = useLookupClient(slug);
  const [values, setValues] = useState<ContactValues>(() => ({
    ...initialValues,
    homeVisit: initialHomeVisit(service, initialValues.homeVisit),
  }));
  // Si el cliente cambia a "en el local" y vuelve, recupera lo que ya había marcado.
  const [lastHomeVisit, setLastHomeVisit] = useState<HomeVisitAddress>(initialValues.homeVisit ?? EMPTY_HOME_VISIT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (key: "documentId" | "name" | "email" | "phone" | "notes") => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  // El cliente se identifica con su cédula: se busca entre los clientes de este negocio.
  const verified =
    values.verifiedDocumentId !== "" && values.verifiedDocumentId === normalizeDocumentId(values.documentId);
  const isKnownClient = verified && values.knownClientName !== null;

  const verifyDocument = async () => {
    const parsed = validate(clientLookupSchema, { documentId: values.documentId });
    const documentId = parsed.data?.documentId ?? "";
    const error = parsed.errors.documentId ?? documentIdError(documentId, business.timezone);
    setErrors(error ? { documentId: error } : {});
    if (error) return;
    try {
      const result = await lookup.mutateAsync(documentId);
      setValues((current) => ({
        ...current,
        documentId,
        verifiedDocumentId: documentId,
        knownClientName: result.found ? result.greetingName : null,
      }));
    } catch (lookupError) {
      setErrors({ documentId: getErrorMessage(lookupError) });
    }
  };
  const updateHomeVisit = (patch: Partial<HomeVisitAddress>) => {
    setValues((current) => ({ ...current, homeVisit: { ...(current.homeVisit ?? EMPTY_HOME_VISIT), ...patch } }));
    setErrors((current) => clearHomeVisitErrors(current, patch));
  };
  const chooseHome = (atHome: boolean) => {
    if (!atHome && values.homeVisit) setLastHomeVisit(values.homeVisit);
    setValues((current) => ({ ...current, homeVisit: atHome ? lastHomeVisit : null }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!verified) return verifyDocument();
    // Un cliente registrado no vuelve a escribir sus datos: se usan los que ya tiene el negocio.
    const contact = isKnownClient ? { name: "", email: "", phone: "" } : values;
    const result = validate(publicBookingSchema, { ...selection, ...values, ...contact });
    const newClient = isKnownClient ? null : validate(newClientContactSchema, values);
    setErrors({ ...result.errors, ...newClient?.errors });
    if (result.success && (!newClient || newClient.success)) onContinue(result.data, values);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField
        label="Número de cédula"
        error={errors.documentId}
        hint={verified ? undefined : "Sólo números, sin guiones. Con ella te reconocemos si ya eres cliente."}
      >
        {(field) => (
          <div className="flex gap-2">
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
            {!verified && (
              <SubmitButton type="button" variant="outline" className="h-10" loading={lookup.isPending} onClick={verifyDocument}>
                <Search /> Buscar
              </SubmitButton>
            )}
          </div>
        )}
      </FormField>

      {verified && (
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
            isKnownClient ? "bg-emerald-50 text-emerald-900" : "bg-muted/60 text-muted-foreground",
          )}
        >
          {isKnownClient ? (
            <>
              <UserCheck className="size-4 shrink-0" aria-hidden />
              ¡Hola de nuevo, {values.knownClientName}! Ya tenemos tus datos de contacto.
            </>
          ) : (
            "Es tu primera reserva aquí: completa tus datos."
          )}
        </p>
      )}

      {!verified ? (
        <Button type="submit" size="lg" className="h-11 text-sm" disabled={lookup.isPending}>
          Continuar <ArrowRight />
        </Button>
      ) : (
        <>
          {service.location === "both" && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">¿Dónde quieres tu cita?</legend>
              <div role="radiogroup" aria-label="Lugar de la cita" className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    atHome: false,
                    icon: Store,
                    title: `En ${business.name}`,
                    detail: business.address || "En el local del negocio",
                  },
                  {
                    atHome: true,
                    icon: Home,
                    title: "A domicilio",
                    detail:
                      service.homeVisitFee && isPriceVisible(service)
                        ? `Vamos a tu casa · +${formatCurrency(service.homeVisitFee, business.currency)}`
                        : "Vamos a tu casa",
                  },
                ].map((option) => {
                  const selected = Boolean(values.homeVisit) === option.atHome;
                  return (
                    <button
                      key={option.title}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseHome(option.atHome)}
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
          {!isKnownClient && (
            <>
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
            </>
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
          <Button type="submit" size="lg" className="h-11 text-sm">
            Continuar <ArrowRight />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Usaremos tus datos sólo para gestionar esta cita. No necesitas crear una cuenta.
          </p>
        </>
      )}
    </form>
  );
}
