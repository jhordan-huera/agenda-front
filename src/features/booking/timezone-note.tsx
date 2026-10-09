import { Globe } from "lucide-react";
import { TIMEZONES } from "@/lib/constants/business";
import { formatDate, formatDuration, plural } from "@/lib/format";
import { getZonedNow, minutesToTime, timeToMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ISODate } from "@/types";

/**
 * Las horas de la reserva son las del negocio. Si el dispositivo del paciente está en otra zona
 * horaria (p. ej. reserva desde el extranjero), se le avisa: "Horas de Ecuador (GMT-5)" y, si el
 * desfase es distinto, a qué hora es la cita donde está.
 */

/** Zona horaria del dispositivo (undefined si el navegador no la informa). */
function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** Desfase de una zona respecto a UTC en un instante, en minutos (Ecuador: -300). */
function offsetMinutes(timezone: string, at: number): number {
  const instant = Math.floor(at / 60_000) * 60_000;
  const { date, minutes } = getZonedNow(timezone, new Date(instant));
  return Math.round((Date.parse(`${date}T00:00:00Z`) + minutes * 60_000 - instant) / 60_000);
}

/** Instante (ms) de una fecha y hora "de pared" en una zona. */
function zonedInstant(timezone: string, date: ISODate, time: string): number {
  const asUtc = Date.parse(`${date}T00:00:00Z`) + timeToMinutes(time) * 60_000;
  const guess = asUtc - offsetMinutes(timezone, asUtc) * 60_000;
  return asUtc - offsetMinutes(timezone, guess) * 60_000;
}

/** "GMT-5", "GMT+5:30", "GMT". */
function gmtLabel(offset: number): string {
  if (offset === 0) return "GMT";
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `GMT${offset > 0 ? "+" : "-"}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

/** "Ecuador (GMT-5)"; a las zonas con horario de verano se les añade el desfase de ese día. */
function zoneLabel(timezone: string, offset: number): string {
  const label = TIMEZONES.find((zone) => zone.value === timezone)?.label ?? timezone;
  if (label.includes("GMT")) return label;
  return label.endsWith(")") ? label.replace(/\)$/, `, ${gmtLabel(offset)})`) : `${label} (${gmtLabel(offset)})`;
}

/**
 * Aviso de zona horaria, o null si el dispositivo está en la del negocio. Con fecha y hora, dice a
 * qué hora es la cita en la zona del paciente; sin ellas, cuántas horas de diferencia hay.
 */
function getTimezoneNote(timezone: string, date?: ISODate | null, time?: string | null): string | null {
  const device = deviceTimezone();
  if (!device || device === timezone) return null;
  try {
    const at = date ? zonedInstant(timezone, date, time ?? "12:00") : Date.now();
    const businessOffset = offsetMinutes(timezone, at);
    const deviceOffset = offsetMinutes(device, at);
    const base = `Horas de ${zoneLabel(timezone, businessOffset)}`;
    if (businessOffset === deviceOffset) return `${base}.`;
    if (date && time) {
      const local = getZonedNow(device, new Date(at));
      const localTime = minutesToTime(local.minutes);
      const day = local.date === date ? "" : ` del ${formatDate(local.date, "EEEE d 'de' MMMM")}`;
      const article = local.minutes >= 60 && local.minutes < 120 ? "a la" : "a las";
      return `${base}. En tu zona horaria (${gmtLabel(deviceOffset)}), la cita es ${article} ${localTime}${day}.`;
    }
    const difference = Math.abs(deviceOffset - businessOffset);
    const amount = difference % 60 === 0 ? plural(difference / 60, "hora", "horas") : formatDuration(difference);
    return `${base}: ${amount} ${deviceOffset > businessOffset ? "menos" : "más"} que en tu zona horaria.`;
  } catch {
    // Zona desconocida para el navegador: no se avisa antes que mostrar algo mal.
    return null;
  }
}

interface TimezoneNoteProps {
  /** Zona horaria del negocio. */
  timezone: string;
  date?: ISODate | null;
  time?: string | null;
  className?: string;
  /** Etiqueta del elemento: "dd" dentro de una lista de definiciones. */
  as?: "p" | "dd";
}

/** Nota pequeña bajo las horas: sólo aparece si el dispositivo está en otra zona horaria. */
export function TimezoneNote({ timezone, date, time, className, as: Tag = "p" }: TimezoneNoteProps) {
  const note = getTimezoneNote(timezone, date, time);
  if (!note) return null;
  return (
    <Tag className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
      <Globe className="mt-px size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">{note}</span>
    </Tag>
  );
}
