import { cn } from "@/lib/utils";
import type { WeekServices } from "./specialties";

/*
 * La agenda de la semana de ejemplo del panel de marca (spec 043): cuatro días (tres en el celular) de 9:00 a
 * 12:00, con las citas que confirmó el paciente en durazno, las pendientes con borde y las reservas online en
 * tomate. Datos de ejemplo, con su marca. Es una tabla, así los lectores de pantalla la recorren por día y hora.
 */

type Kind = "confirmed" | "pending" | "online";

interface Appointment {
  name: string;
  detail: string;
  kind: Kind;
}

const DAYS = [
  { name: "Lun", number: 10 },
  { name: "Mar", number: 11, today: true },
  { name: "Mié", number: 12 },
  { name: "Jue", number: 13, wideOnly: true },
];

/** Los servicios de la portada (los de una consulta de psicología, como los datos de demostración). */
const DEFAULT_SERVICES: WeekServices = { main: "Terapia individual", first: "Primera consulta", other: "Terapia de pareja" };

/** Una fila por hora, con la cita de cada día (null: libre), con los servicios de la página. */
const rowsFor = (services: WeekServices): { hour: string; cells: (Appointment | null)[] }[] => [
  {
    hour: "9:00",
    cells: [
      { name: "María P.", detail: services.main, kind: "confirmed" },
      null,
      { name: "Luis R.", detail: "Reservó en tu página", kind: "online" },
      { name: "Ana T.", detail: "Seguimiento", kind: "confirmed" },
    ],
  },
  { hour: "10:00", cells: [null, { name: "Carla M.", detail: services.first, kind: "pending" }, null, null] },
  {
    hour: "11:00",
    cells: [
      { name: "Jorge V.", detail: services.other, kind: "pending" },
      { name: "Sofía L.", detail: "Confirmó que va", kind: "confirmed" },
      null,
      { name: "Pedro A.", detail: "Reservó en tu página", kind: "online" },
    ],
  },
  { hour: "12:00", cells: [null, null, { name: "Diana C.", detail: "Seguimiento", kind: "confirmed" }, null] },
];

const KIND_STYLES: Record<Kind, string> = {
  confirmed: "bg-highlight text-highlight-foreground",
  pending: "bg-card text-card-foreground ring-1 ring-highlight ring-inset",
  online: "bg-ink text-primary-foreground",
};

const KIND_LABELS: Record<Kind, string> = {
  confirmed: "Confirmó que va",
  pending: "Pendiente",
  online: "Reserva online",
};

/** Las columnas que sólo se ven desde el tamaño de una tableta. */
const wideOnly = (wide?: boolean) => (wide ? "hidden sm:table-cell" : undefined);

/** `services`: los de la especialidad en su página (spec 041); en la portada, los de una consulta de psicología. */
export function WeekPreview({ services = DEFAULT_SERVICES, className }: { services?: WeekServices; className?: string }) {
  const rows = rowsFor(services);
  return (
    <figure className={cn("landing-week-in rounded-[1.25rem] bg-card p-4 text-card-foreground shadow-[0_30px_60px_-30px_rgb(66_20_4/0.55)] sm:p-5", className)}>
      <figcaption className="flex items-center justify-between gap-3">
        <span className="font-display text-base font-bold">Tu semana</span>
        <span className="rounded-full px-2.5 py-0.5 text-xs text-muted-foreground ring-1 ring-border ring-inset">Ejemplo</span>
      </figcaption>
      <table className="mt-3 w-full table-fixed border-separate border-spacing-1.5 text-left">
        <caption className="sr-only">Semana de ejemplo, de lunes a jueves, de 9:00 a 12:00</caption>
        <colgroup>
          <col className="w-11" />
        </colgroup>
        <thead>
          <tr>
            <td />
            {DAYS.map((day) => (
              <th key={day.name} scope="col" className={cn("pb-1 text-center font-normal", wideOnly(day.wideOnly))}>
                <span className="block text-xs text-muted-foreground">{day.name}</span>
                <span className={cn("font-display block text-lg leading-tight font-bold", day.today && "text-ink")}>{day.number}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hour}>
              <th scope="row" className="pt-1.5 pr-1 align-top text-right text-xs font-normal text-muted-foreground tabular-nums">
                {row.hour}
              </th>
              {row.cells.map((appointment, index) => (
                <td key={index} className={cn("h-12 align-top", wideOnly(DAYS[index].wideOnly))}>
                  {appointment ? (
                    <div className={cn("h-full min-h-12 rounded-[0.625rem] px-2 py-1.5 leading-tight", KIND_STYLES[appointment.kind])}>
                      <p className="truncate text-xs font-bold">{appointment.name}</p>
                      <p className="truncate text-[0.6875rem] opacity-85">{appointment.detail}</p>
                    </div>
                  ) : (
                    <div className="h-full min-h-12 rounded-[0.625rem] bg-muted/60">
                      <span className="sr-only">Libre</span>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(Object.keys(KIND_LABELS) as Kind[]).map((kind) => (
          <li key={kind} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-[3px]", KIND_STYLES[kind])} />
            {KIND_LABELS[kind]}
          </li>
        ))}
      </ul>
    </figure>
  );
}
