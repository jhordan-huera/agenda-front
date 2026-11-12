import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientCombobox } from "@/features/clients/client-combobox";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useAddWaitlistEntry } from "@/hooks/queries/use-waitlist";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBusinessNow } from "@/hooks/use-business-now";
import { offersService } from "@/lib/availability";
import { WAITLIST_DAY_PARTS, WAITLIST_DEFAULT_DAYS, WEEK_DAYS } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import { addDaysISO } from "@/lib/time";
import { waitlistEntrySchema } from "@/lib/validations/waitlist";
import type { Business, DayOfWeek, ISODate, WaitlistDayPart } from "@/types";
import { ChoiceChip } from "./choice-chip";
import { toggleChoice } from "./toggle-choice";

const ANY = "any";

/**
 * «Anotar» en la lista de espera desde el panel (spec 047): alguien que llamó por teléfono o un paciente que ya
 * existe. El email es opcional: sin él, el equipo le avisa por WhatsApp. El rol Profesional anota en su agenda.
 */
export function WaitlistEntryDialog({
  open,
  onOpenChange,
  business,
  defaultProfessionalId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: Business;
  defaultProfessionalId: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anotar en la lista de espera</DialogTitle>
          <DialogDescription>Cuando se libere una hora que le sirva, le avisamos por email (si lo tiene) y te avisa la campana.</DialogDescription>
        </DialogHeader>
        {open && <EntryForm business={business} defaultProfessionalId={defaultProfessionalId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({ business, defaultProfessionalId, onDone }: { business: Business; defaultProfessionalId: string | null; onDone: () => void }) {
  const { clients, services, clientsById } = useLookups();
  const agendas = useAgendas();
  const now = useBusinessNow(business.timezone);
  const add = useAddWaitlistEntry();
  const activeServices = services.filter((service) => service.isActive);
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(activeServices[0]?.id ?? "");
  const [professionalId, setProfessionalId] = useState<string>(defaultProfessionalId ?? (agendas.multiple ? ANY : (agendas.selectable[0]?.id ?? ANY)));
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [parts, setParts] = useState<WaitlistDayPart[]>([]);
  const maxAdvance = business.bookingSettings.maxAdvanceDays;
  const [until, setUntil] = useState<ISODate>(addDaysISO(now.date, Math.min(WAITLIST_DEFAULT_DAYS, maxAdvance)));
  const [error, setError] = useState<string | null>(null);
  const offering = agendas.selectable.filter((professional) => offersService(professional, serviceId));

  const chooseClient = (id: string) => {
    setClientId(id);
    const client = clientsById.get(id);
    if (client) {
      setName(client.name);
      setEmail(client.email ?? "");
      setPhone(client.phone ?? "");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = waitlistEntrySchema.safeParse({
      serviceId,
      professionalId: professionalId === ANY ? null : professionalId,
      days,
      dayParts: parts,
      until,
      clientId: clientId || null,
      name,
      email,
      phone,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }
    try {
      await add.mutateAsync(parsed.data);
      toast.success(`${name.split(" ")[0]} quedó en la lista de espera`);
      onDone();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormField label="Paciente" optional hint="Si ya es paciente, elígelo; si no, escribe sus datos abajo.">
        {(field) => <ClientCombobox {...field} clients={clients.filter((client) => client.isActive)} value={clientId} onChange={chooseClient} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre" className="sm:col-span-2">
          {(field) => <Input {...field} value={name} onChange={(event) => setName(event.target.value)} />}
        </FormField>
        <FormField label="Email" optional>
          {(field) => <Input {...field} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />}
        </FormField>
        <FormField label="Teléfono">
          {(field) => <Input {...field} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />}
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Servicio">
          {(field) => (
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger {...field} className="w-full">
                <SelectValue placeholder="Elige el servicio" />
              </SelectTrigger>
              <SelectContent>
                {activeServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        {agendas.multiple && (
          <FormField label="Con">
            {(field) => (
              <Select value={professionalId} onValueChange={setProfessionalId}>
                <SelectTrigger {...field} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Cualquier profesional</SelectItem>
                  {offering.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id}>
                      {professional.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Días que le sirven</legend>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((day) => (
            <ChoiceChip key={day.value} pressed={days.includes(day.value)} onClick={() => setDays((current) => toggleChoice(current, day.value))}>
              {day.short}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Hora del día</legend>
        <div className="flex flex-wrap gap-2">
          {WAITLIST_DAY_PARTS.map((part) => (
            <ChoiceChip key={part.value} pressed={parts.includes(part.value)} onClick={() => setParts((current) => toggleChoice(current, part.value))}>
              {part.label}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>
      <FormField label="Espera hasta el">
        {(field) => (
          <Input
            {...field}
            type="date"
            value={until}
            min={now.date}
            max={addDaysISO(now.date, maxAdvance)}
            onChange={(event) => setUntil(event.target.value)}
            className="sm:max-w-48"
          />
        )}
      </FormField>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={add.isPending}>
          {add.isPending ? "Anotando…" : "Anotar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
