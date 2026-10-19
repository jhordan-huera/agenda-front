import { SwitchField } from "@/features/settings/switch-field";
import { CALENDAR_INVITE_DAYS } from "@/lib/constants/business";

interface CalendarInvitesFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** A dónde llegan las invitaciones ("" = la agenda no tiene email: el interruptor queda deshabilitado y explicado). */
  email: string;
  /** "own": la agenda de quien la mira («Tu agenda»); "other": la de otro profesional (Profesionales). */
  person: "own" | "other";
  /** Guardando el cambio. */
  disabled?: boolean;
}

/**
 * El interruptor de las invitaciones de calendario de una agenda (spec 027), con su explicación: una
 * invitación por cada cita de los próximos días, que se actualiza sola si la cita cambia y se quita si se
 * cancela; la primera vez puede que haya que tocar «Añadir al calendario»; al desactivarlo no se borra lo
 * que ya está en el calendario; y a qué email llegan.
 */
export function CalendarInvitesField({ checked, onCheckedChange, email, person, disabled }: CalendarInvitesFieldProps) {
  const own = person === "own";
  const description = email ? (
    <>
      {own ? "Te llega" : "Le llega"} una invitación por cada cita de los próximos {CALENDAR_INVITE_DAYS} días: se actualiza sola si
      la cita cambia y se quita si se cancela. La primera vez puede que {own ? "tengas" : "tenga"} que tocar «Añadir al calendario»
      en el email. Al desactivarlo, los eventos que ya están en {own ? "tu" : "su"} calendario no se borran. Llegan a{" "}
      <span className="font-medium break-all text-ink">{email}</span>.
    </>
  ) : own ? (
    "Tu agenda no tiene un email al que enviar las invitaciones."
  ) : (
    "Para activarlo, la agenda necesita un email: escribe su «Email para sus avisos» o elige su usuario del equipo."
  );
  return (
    <SwitchField
      label={own ? "Recibir mis citas en mi calendario (Google, iPhone, Outlook)" : "Recibir sus citas en su calendario (Google, iPhone, Outlook)"}
      description={description}
      checked={checked && Boolean(email)}
      onCheckedChange={onCheckedChange}
      disabled={disabled || !email}
    />
  );
}
