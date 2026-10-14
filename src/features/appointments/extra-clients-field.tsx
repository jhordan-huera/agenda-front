import { UserPlus, X } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { ClientCombobox } from "@/features/clients/client-combobox";
import type { Client } from "@/types";

/** Pacientes por cita: el principal y hasta 2 más (decisión del 2026-10-13). */
export const MAX_EXTRA_CLIENTS = 2;

interface ExtraClientsFieldProps {
  /** Los que se pueden elegir (activos y del alcance del usuario). */
  clients: Client[];
  clientsById: Map<string, Client>;
  /** El paciente principal de la cita: no se ofrece aquí. */
  mainClientId: string;
  /** Los otros pacientes; "" es un espacio aún sin elegir. */
  value: string[];
  onChange: (next: string[]) => void;
  /** El negocio permite agregar pacientes (Business.multiClientAppointments). Si no, sólo se quitan. */
  canAdd: boolean;
  /** Crear un paciente nuevo para el espacio `index` (con lo escrito en el buscador). */
  onCreate: (index: number, name: string) => void;
  error?: string;
}

/**
 * «Otros pacientes» de una cita (sesiones de pareja o de familia): cada uno recibe sus avisos y la cita
 * aparece en su ficha. Sin el permiso del negocio, los que ya tiene la cita se ven y se pueden quitar.
 */
export function ExtraClientsField({ clients, clientsById, mainClientId, value, onChange, canAdd, onCreate, error }: ExtraClientsFieldProps) {
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const replace = (index: number, clientId: string) => onChange(value.map((current, i) => (i === index ? clientId : current)));
  // En cada espacio: ni el principal ni los ya elegidos en los otros.
  const optionsFor = (index: number) =>
    clients.filter((client) => client.id !== mainClientId && !value.some((id, i) => i !== index && id === client.id));

  return (
    <section aria-labelledby="extra-clients-title" className="grid gap-3 rounded-lg border border-dashed p-3">
      <div>
        <h3 id="extra-clients-title" className="text-sm font-medium">
          Otros pacientes <span className="font-normal text-muted-foreground">(opcional)</span>
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {canAdd
            ? "Para sesiones de pareja o de familia: cada uno recibe sus avisos y la cita aparece en su ficha. Hasta 3 pacientes por cita."
            : "Este negocio ya no agrega pacientes a las citas: puedes quitarlos."}
        </p>
      </div>

      {value.map((clientId, index) => {
        const name = clientsById.get(clientId)?.name;
        return (
          <FormField key={index} label={`Paciente ${index + 2}`} className="gap-1.5">
            {(field) => (
              <div className="flex gap-2">
                {canAdd ? (
                  <ClientCombobox
                    {...field}
                    className="min-w-0 flex-1"
                    clients={optionsFor(index)}
                    value={clientId}
                    onChange={(id) => replace(index, id)}
                    onCreate={(text) => onCreate(index, text)}
                  />
                ) : (
                  <p id={field.id} className="flex h-9 min-w-0 flex-1 items-center truncate rounded-md border bg-muted/40 px-3 text-sm">
                    {name ?? "Cliente eliminado"}
                  </p>
                )}
                {canAdd && (
                  <Button type="button" variant="outline" aria-label={`Crear un paciente nuevo como paciente ${index + 2}`} onClick={() => onCreate(index, "")}>
                    <UserPlus /> <span className="hidden sm:inline">Nuevo</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={name ? `Quitar a ${name} de la cita` : "Quitar este paciente"}
                  onClick={() => remove(index)}
                >
                  <X />
                </Button>
              </div>
            )}
          </FormField>
        );
      })}

      {canAdd && value.length < MAX_EXTRA_CLIENTS && (
        <Button type="button" variant="outline" className="justify-self-start" onClick={() => onChange([...value, ""])}>
          <UserPlus /> Agregar otro paciente
        </Button>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
