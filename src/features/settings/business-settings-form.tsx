import { Building2, X } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/use-session";
import { useUpdateBusiness } from "@/hooks/queries/use-account";
import { useCategories } from "@/hooks/queries/use-categories";
import { TIMEZONES, getTimezoneInfo } from "@/lib/constants/business";
import { EMPTY_SOCIAL_LINKS, SOCIAL_NETWORKS } from "@/lib/constants/loyalty";
import { getErrorMessage } from "@/lib/data";
import { businessProfileSchema, socialLinksSchema, type BusinessProfileInput } from "@/lib/validations/business";
import { validate } from "@/lib/validations/validate";
import type { Business, BusinessCategory, SocialLinks } from "@/types";
import { BookingLinkField } from "./booking-link-field";
import { ImageUploadField } from "./image-upload-field";
import { SettingsSection } from "./settings-section";
import { useSettingsForm } from "./use-settings-form";

// El mapa (Leaflet) sólo se descarga al abrir esta sección.
const LocationPicker = lazy(() => import("@/components/shared/location-picker"));

export function BusinessSettingsForm({ business }: { business: Business }) {
  const updateBusiness = useUpdateBusiness();
  const { session } = useSession();
  // La categoría sólo la cambia el super admin (aquí, en modo soporte, o desde /admin).
  const canChangeCategory = Boolean(session?.support);
  const { categories } = useCategories();
  // Se ofrecen las activas y, si estuviera desactivada, la que ya tiene el negocio.
  const categoryOptions = categories.filter((category) => category.isActive || category.id === business.category);
  // Las redes del negocio (spec 052): un backend anterior no las manda (vacías).
  const saved: BusinessProfileInput & { socialLinks: SocialLinks } = {
    name: business.name,
    description: business.description,
    category: business.category,
    slug: business.slug,
    timezone: business.timezone,
    phone: business.phone,
    email: business.email,
    address: business.address,
    lat: business.lat,
    lng: business.lng,
    logoUrl: business.logoUrl,
    socialLinks: { ...EMPTY_SOCIAL_LINKS, ...business.socialLinks },
  };
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm(saved);
  const [uploading, setUploading] = useState(false);
  const zone = getTimezoneInfo(values.timezone);
  const point = values.lat !== null && values.lng !== null ? { lat: values.lat, lng: values.lng } : null;

  const submit = async () => {
    const { socialLinks, ...profile } = values;
    const result = validate(businessProfileSchema, profile);
    // Se guardan como el enlace de cada red («@sonrisa» pasa a https://www.instagram.com/sonrisa).
    const social = validate(socialLinksSchema, socialLinks);
    setErrors({ ...result.errors, ...social.errors });
    if (!result.success || !social.success) return;
    try {
      await updateBusiness.mutateAsync({ ...result.data, socialLinks: social.data });
      reset({ ...result.data, socialLinks: social.data });
      toast.success("Datos del negocio actualizados");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Negocio"
      description="Información pública que ven tus clientes al reservar."
      dirty={dirty}
      saving={updateBusiness.isPending}
      uploading={uploading}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <ImageUploadField
        target="logo"
        label="Logo"
        shape="square"
        value={values.logoUrl}
        onChange={(logoUrl) => setField("logoUrl", logoUrl)}
        onUploadingChange={setUploading}
        fallback={<Building2 className="size-6" aria-hidden />}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Nombre del negocio" error={errors.name}>
          {(field) => <Input {...field} value={values.name} onChange={(e) => setField("name", e.target.value)} />}
        </FormField>
        <FormField
          label="Categoría"
          error={errors.category}
          hint={canChangeCategory ? undefined : "Para cambiarla, escribe a soporte."}
        >
          {(field) => (
            <Select
              value={values.category}
              disabled={!canChangeCategory}
              onValueChange={(category) => setField("category", category as BusinessCategory)}
            >
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {categoryOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>
      <FormField label="Descripción" error={errors.description} optional hint="Aparece en tu página de reservas.">
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            placeholder="Cuenta a tus clientes qué ofreces…"
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Enlace de reservas" error={errors.slug} hint="Minúsculas, números y guiones.">
        {(field) => (
          <div className="flex items-center rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="pl-2.5 text-sm text-muted-foreground">/book/</span>
            <Input
              {...field}
              className="border-0 pl-0.5 focus-visible:ring-0"
              value={values.slug}
              onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            />
          </div>
        )}
      </FormField>
      <BookingLinkField savedSlug={business.slug} pendingChange={values.slug !== business.slug} businessName={business.name} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Teléfono del negocio" error={errors.phone} optional>
          {(field) => <Input {...field} type="tel" value={values.phone} onChange={(e) => setField("phone", e.target.value)} />}
        </FormField>
        <FormField label="Email del negocio" error={errors.email} optional>
          {(field) => <Input {...field} type="email" value={values.email} onChange={(e) => setField("email", e.target.value)} />}
        </FormField>
      </div>
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">
          Redes sociales <span className="font-normal text-muted-foreground">(opcional)</span>
        </legend>
        <p className="text-xs text-muted-foreground">
          Salen en tu página de reservas y en la tarjeta de fidelización de tus pacientes, sólo las que pongas. Escribe tu
          @usuario o el enlace de tu página.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SOCIAL_NETWORKS.map((network) => (
            <FormField key={network.key} label={network.label} error={errors[network.key]}>
              {(field) => (
                <Input
                  {...field}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="@usuario"
                  value={values.socialLinks[network.key]}
                  onChange={(e) => {
                    setField("socialLinks", { ...values.socialLinks, [network.key]: e.target.value });
                    // Su error desaparece al corregirlo, como el de los demás campos.
                    setErrors((current) => {
                      if (!(network.key in current)) return current;
                      const next = { ...current };
                      delete next[network.key];
                      return next;
                    });
                  }}
                />
              )}
            </FormField>
          ))}
        </div>
      </fieldset>
      <FormField
        label="Ubicación del local"
        error={errors.lat}
        optional
        hint="Marca la puerta de tu local: tus clientes verán el punto en tu página de reservas y el botón «Cómo llegar» los lleva allí."
      >
        {(field) => (
          <div className="grid gap-2">
            <Suspense fallback={<Skeleton className="h-80 rounded-2xl sm:h-96" />}>
              <LocationPicker
                value={point}
                onChange={({ lat, lng }) => {
                  setField("lat", lat);
                  setField("lng", lng);
                }}
                onAddressSuggestion={(address) => {
                  // Sólo completa la dirección si aún está vacía: no pisa lo que escribió el negocio.
                  if (!values.address.trim()) setField("address", address);
                }}
                defaultCenter={zone.center}
                centerOnAddress={business.address || undefined}
                countryCode={zone.countryCode}
                invalid={Boolean(field["aria-invalid"])}
                describedBy={`${field.id}-status`}
              />
            </Suspense>
            {point && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start text-muted-foreground"
                onClick={() => {
                  setField("lat", null);
                  setField("lng", null);
                }}
              >
                <X /> Quitar la ubicación
              </Button>
            )}
          </div>
        )}
      </FormField>
      <FormField
        label="Dirección"
        error={errors.address}
        optional
        hint="Calle, número y sector. Se muestra junto al mapa en tu página de reservas y en los emails."
      >
        {(field) => (
          <Input
            {...field}
            autoComplete="street-address"
            value={values.address}
            onChange={(e) => setField("address", e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Zona horaria" error={errors.timezone} hint="Las citas y la disponibilidad se calculan en esta zona.">
        {(field) => (
          <Select value={values.timezone} onValueChange={(timezone) => setField("timezone", timezone)}>
            <SelectTrigger {...field} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {TIMEZONES.map((timezone) => (
                <SelectItem key={timezone.value} value={timezone.value}>
                  {timezone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
    </SettingsSection>
  );
}
