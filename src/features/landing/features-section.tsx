import { BellRing, CalendarDays, IdCard, MapPin, Smartphone, Stethoscope, type LucideIcon } from "lucide-react";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

/** El color de cada icono, alternando como en una cuadrícula de funciones: marca, lila y verde. */
const TONES = [
  "bg-accent text-ink",
  "bg-secondary text-secondary-foreground",
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
];

/** Lo que hace la app, para quién es cada cosa: el profesional y sus clientes. */
const FEATURES: { audience: string; icon: LucideIcon; title: string; description: string }[] = [
  {
    audience: "Para ti",
    icon: CalendarDays,
    title: "Tu día de un vistazo",
    description: "Agenda por día, semana o mes. Bloquea el almuerzo o tus vacaciones y nadie reserva esas horas.",
  },
  {
    audience: "Para ti",
    icon: IdCard,
    title: "Cada cliente, una ficha",
    description: "Identificado por su cédula, con su historial de citas, notas privadas y lo que te ha pagado.",
  },
  {
    audience: "Para ti",
    icon: Stethoscope,
    title: "Historia clínica",
    description: "Para consultorios de salud: antecedentes y evoluciones de cada paciente, listas para imprimir.",
  },
  {
    audience: "Para tus clientes",
    icon: Smartphone,
    title: "Reservan sin crear cuenta",
    description: "Eligen servicio, día y hora libre desde el celular, sin registrarse ni descargar nada.",
  },
  {
    audience: "Para tus clientes",
    icon: BellRing,
    title: "Recordatorio antes de la cita",
    description: "Les llega un email antes de la cita, con la dirección y el enlace para llegar en Google Maps.",
  },
  {
    audience: "Para tus clientes",
    icon: MapPin,
    title: "Atención a domicilio",
    description: "Marcan en el mapa el lugar exacto donde los visitas.",
  },
];

export function FeaturesSection() {
  return (
    <section id="caracteristicas" className="scroll-mt-28 bg-canvas py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Qué hace"
          title="Menos mensajes para cuadrar"
          highlight="una hora"
          description={`${APP_NAME} responde por ti la pregunta de siempre: «¿tiene un espacio el jueves?».`}
        />
        <ul className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ audience, icon: Icon, title, description }, index) => (
            <li
              key={title}
              className="rounded-2xl border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgb(16_24_40/0.04)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_16px_32px_-18px_rgb(29_36_51/0.28)] motion-safe:hover:-translate-y-0.5"
            >
              <span className={cn("flex size-11 items-center justify-center rounded-xl", TONES[index % TONES.length])}>
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="mt-5 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">{audience}</p>
              <h3 className="mt-1 text-lg font-bold">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
