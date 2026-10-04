import { MapPinned } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getTimezoneInfo } from "@/lib/constants/business";
import type { FieldErrors } from "@/lib/validations/validate";
import type { HomeVisitAddress } from "@/types";

// El mapa (Leaflet) sólo se descarga cuando hace falta.
const LocationPicker = lazy(() => import("@/components/shared/location-picker"));

interface HomeVisitFieldsProps {
  value: HomeVisitAddress;
  onChange: (patch: Partial<HomeVisitAddress>) => void;
  /** Errores con las claves "homeVisit.address", "homeVisit.reference" y "homeVisit.lat". */
  errors: FieldErrors;
  /** Zona horaria del negocio: país para la búsqueda y centro inicial del mapa. */
  timezone: string;
  /** Dirección en la que centrar el mapa al abrirlo (la del negocio). */
  centerOnAddress?: string;
  /** Página pública: marcar el punto en el mapa es obligatorio. En el panel es opcional. */
  mapRequired?: boolean;
}

/** Ubicación de una cita a domicilio: punto exacto en el mapa, dirección y referencia. */
export function HomeVisitFields({ value, onChange, errors, timezone, centerOnAddress, mapRequired }: HomeVisitFieldsProps) {
  const zone = getTimezoneInfo(timezone);
  const hasPoint = value.lat !== null && value.lng !== null;
  const [showMap, setShowMap] = useState(mapRequired || hasPoint);
  // Mientras no se escriba a mano, la dirección se completa con la del punto marcado.
  const [addressEdited, setAddressEdited] = useState(Boolean(value.address));

  return (
    <div className="grid gap-4">
      {showMap ? (
        <FormField
          label="Ubicación exacta"
          error={errors["homeVisit.lat"]}
          hint={mapRequired ? undefined : "Opcional: con el punto exacto, el botón \"Cómo llegar\" te lleva a la puerta."}
        >
          {(field) => (
            <Suspense fallback={<Skeleton className="h-80 rounded-2xl sm:h-96" />}>
              <LocationPicker
                value={hasPoint ? { lat: value.lat!, lng: value.lng! } : null}
                onChange={(point) => onChange(point)}
                onAddressSuggestion={(address) => {
                  if (!addressEdited) onChange({ address });
                }}
                defaultCenter={zone.center}
                centerOnAddress={centerOnAddress}
                countryCode={zone.countryCode}
                invalid={Boolean(field["aria-invalid"])}
                describedBy={`${field.id}-status`}
              />
            </Suspense>
          )}
        </FormField>
      ) : (
        <Button type="button" variant="outline" className="justify-self-start" onClick={() => setShowMap(true)}>
          <MapPinned /> Marcar la ubicación en el mapa
        </Button>
      )}
      <FormField
        label="Dirección"
        error={errors["homeVisit.address"]}
        hint={showMap ? "Se completa al marcar el mapa; puedes corregirla." : undefined}
      >
        {(field) => (
          <Input
            {...field}
            autoComplete="street-address"
            placeholder="Calle, número y sector"
            value={value.address}
            onChange={(e) => {
              setAddressEdited(true);
              onChange({ address: e.target.value });
            }}
          />
        )}
      </FormField>
      <FormField label="Referencia" error={errors["homeVisit.reference"]} optional>
        {(field) => (
          <Input
            {...field}
            placeholder="Ej.: casa blanca de dos pisos, junto a la farmacia"
            value={value.reference}
            onChange={(e) => onChange({ reference: e.target.value })}
          />
        )}
      </FormField>
    </div>
  );
}
