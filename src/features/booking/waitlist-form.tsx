import { CalendarClock, CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceChip } from "@/features/waitlist/choice-chip";
import { toggleChoice } from "@/features/waitlist/toggle-choice";
import { useJoinWaitlist } from "@/hooks/queries/use-public-booking";
import { WAITLIST_DAY_PARTS, WAITLIST_DEFAULT_DAYS, WEEK_DAYS } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import { formatLongDate } from "@/lib/format";
import { addDaysISO } from "@/lib/time";
import { publicWaitlistSchema } from "@/lib/validations/waitlist";
import type { DayOfWeek, ISODate, PublicProfessional, PublicService, WaitlistDayPart } from "@/types";
import type { ContactValues } from "./contact";
import { CAPTCHA_BOX_CLASS, useCaptcha } from "./use-captcha";


/**
 * «¿No encuentras una hora que te sirva? Anótate en la lista de espera» (spec 047), en el paso de la fecha y la
 * hora de la página de reservas, sólo en los negocios con la lista encendida. Pide los días, la parte del día,
 * hasta cuándo espera, el profesional (si el negocio deja elegirlo) y sus datos, con el CAPTCHA de la reserva.
 */
export function WaitlistForm({
  slug,
  captchaSiteKey,
  service,
  professionals,
  askProfessional,
  defaultProfessionalId,
  defaultDay,
  today,
  maxAdvanceDays,
  contact,
}: {
  slug: string;
  captchaSiteKey: string | null;
  service: PublicService;
  /** Quienes atienden el servicio. */
  professionals: PublicProfessional[];
  askProfessional: boolean;
  defaultProfessionalId: string | null;
  /** El día de la semana que estaba mirando, para empezar marcado. */
  defaultDay: DayOfWeek | null;
  today: ISODate;
  maxAdvanceDays: number;
  contact: ContactValues;
}) {
  const { containerRef, getToken } = useCaptcha(captchaSiteKey);
  const join = useJoinWaitlist(slug, getToken);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<DayOfWeek[]>(defaultDay === null ? [] : [defaultDay]);
  const [parts, setParts] = useState<WaitlistDayPart[]>([]);
  const lastDate = addDaysISO(today, maxAdvanceDays);
  const [until, setUntil] = useState<ISODate>(addDaysISO(today, Math.min(WAITLIST_DEFAULT_DAYS, maxAdvanceDays)));
  const [professionalId, setProfessionalId] = useState<string | null>(askProfessional ? defaultProfessionalId : null);
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email);
  const [phone, setPhone] = useState(contact.phone);
  const [error, setError] = useState<string | null>(null);
  const [joinedUntil, setJoinedUntil] = useState<ISODate | null>(null);

  if (joinedUntil) {
    return (
      <div role="status" className="flex gap-3 rounded-xl bg-accent p-4 text-sm">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
        <div>
          <p className="font-semibold">Listo, estás en la lista de espera.</p>
          <p className="mt-1 text-muted-foreground">
            Te avisaremos por email si se libera una hora que te sirva, hasta el {formatLongDate(joinedUntil)}. Te enviamos un email con
            el enlace para salir de la lista cuando quieras.
          </p>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm">
        <p className="font-medium">¿No encuentras una hora que te sirva?</p>
        <p className="mt-1 text-muted-foreground">Anótate y te avisamos por email si se libera una.</p>
        <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>
          <CalendarClock /> Anotarme en la lista de espera
        </Button>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = publicWaitlistSchema.safeParse({ serviceId: service.id, professionalId, days, dayParts: parts, until, name, email, phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }
    try {
      const result = await join.mutateAsync(parsed.data);
      setJoinedUntil(result.until);
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border p-4 sm:p-5" aria-labelledby="waitlist-title">
      <div>
        <h3 id="waitlist-title" className="text-base font-bold">
          Lista de espera: {service.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Te avisamos por email si se libera una hora con lo que elijas. Avisamos a todos a la vez: se la queda quien reserve primero.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿Qué días te sirven?</legend>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((day) => (
            <ChoiceChip key={day.value} pressed={days.includes(day.value)} onClick={() => setDays((current) => toggleChoice(current, day.value))}>
              {day.label}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿A qué hora del día?</legend>
        <div className="flex flex-wrap gap-2">
          {WAITLIST_DAY_PARTS.map((part) => (
            <ChoiceChip key={part.value} pressed={parts.includes(part.value)} onClick={() => setParts((current) => toggleChoice(current, part.value))}>
              {part.label}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Espero hasta el">
          {(field) => (
            <Input {...field} type="date" value={until} min={addDaysISO(today, 1)} max={lastDate} onChange={(event) => setUntil(event.target.value)} />
          )}
        </FormField>
        {askProfessional && professionals.length > 1 && (
          <FormField label="Con">
            {(field) => (
              <select
                {...field}
                value={professionalId ?? ""}
                onChange={(event) => setProfessionalId(event.target.value || null)}
                className="h-9 w-full rounded-md border border-input bg-field px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              >
                <option value="">Cualquier profesional</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.displayName}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tu nombre" className="sm:col-span-2">
          {(field) => (
            <Input {...field} value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
          )}
        </FormField>
        <FormField label="Email">
          {(field) => (
            <Input {...field} type="email" value={email} autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} />
          )}
        </FormField>
        <FormField label="Teléfono">
          {(field) => (
            <Input {...field} type="tel" value={phone} autoComplete="tel" inputMode="tel" onChange={(event) => setPhone(event.target.value)} />
          )}
        </FormField>
      </div>

      <div ref={containerRef} className={CAPTCHA_BOX_CLASS} />
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={join.isPending}>
          {join.isPending ? "Anotando…" : "Anotarme"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Sólo el negocio ve tus datos. Puedes salir de la lista cuando quieras.</p>
    </form>
  );
}
