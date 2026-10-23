import { IdCard, MapPin } from "lucide-react";
import { NewBookingNotice, WeekSample } from "@/components/shared/week-sample";

const TRUST = [
  { icon: MapPin, label: "Hecho en Ecuador" },
  { icon: IdCard, label: "Tus pacientes no crean cuenta" },
];

/** El ancho de lo que va en el panel: en pantallas grandes no se estira, queda centrado. */
const PANEL_CONTENT = "mx-auto w-full max-w-[40rem] px-12";

/**
 * El panel de la marca junto al formulario (spec 030, sólo en el computador): el casi negro de --shell,
 * sólido y a toda altura, con el mensaje de la portada, la semana de la Agenda entera (nada se sale del
 * panel) y el aviso de la reserva que acaba de entrar; abajo, la línea de confianza. En ventanas bajas se
 * quedan el titular y la semana. Los textos, en --shell-foreground puro o al 75 % (más de 7:1 en los dos
 * modos).
 */
export function AuthShowcase() {
  return (
    <aside
      aria-label="Agenda360: tus pacientes reservan solos desde tu enlace y la cita llega a tu agenda."
      className="flex h-full flex-col overflow-hidden bg-shell text-shell-foreground"
    >
      <div className="flex flex-1 flex-col justify-center py-10">
        <div className={PANEL_CONTENT}>
          {/* Una frase por línea, como en la portada. */}
          <p className="text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] xl:text-[2rem]">
            <span className="block">Tus pacientes eligen su hora.</span> <span className="block">Tú solo atiendes.</span>
          </p>
          <p className="mt-4 hidden leading-relaxed text-shell-foreground/75 [@media(min-height:760px)]:block">
            Las reservas de tu enlace llegan solas a tu agenda, con su confirmación y su recordatorio.
          </p>

          <div className="relative mt-10">
            <WeekSample />
            <NewBookingNotice className="absolute -bottom-6 left-6" />
          </div>
        </div>
      </div>

      <div className="hidden border-t border-shell-foreground/10 py-6 [@media(min-height:820px)]:block">
        <ul className={`${PANEL_CONTENT} grid grid-cols-2 gap-6 text-sm leading-snug text-shell-foreground/75`}>
          {TRUST.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-2">
              <Icon className="mt-px size-4 shrink-0" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
