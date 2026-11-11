import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import {
  BoardVisual,
  BookingVisual,
  CalendarVisual,
  ClinicalVisual,
  PaymentVisual,
  ReminderVisual,
  TeamVisual,
  WeekVisual,
} from "./feature-visuals";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER } from "./landing-styles";
import { FeatureMark, SectionHeading } from "./landing-ui";

/** Las funciones, con los textos de la portada anterior (spec 032), ya comprobados contra lo que hace Agenda360. */
const FEATURES: { title: string; description: string; visual: ReactNode }[] = [
  {
    title: "Tu página de reservas",
    description: "Compartes tu enlace y tus pacientes eligen el servicio y una hora libre, a cualquier hora. No crean cuenta ni descargan nada.",
    visual: <BookingVisual />,
  },
  {
    title: "Recordatorios antes de cada cita",
    description: "Salen solos por email, con las horas de anticipación que elijas y el botón «Confirmo que voy».",
    visual: <ReminderVisual />,
  },
  {
    title: "Cada cita, de la reserva al cobro",
    description: "Por confirmar, confirmadas, atendidas y pagadas. Mueves la cita de columna y Agenda360 hace lo de siempre: el aviso al paciente y la actividad.",
    visual: <BoardVisual />,
  },
  {
    title: "Día, semana y mes",
    description: "Tu agenda y la de tu equipo, cada profesional con su color. Para mover una cita, la arrastras.",
    visual: <WeekVisual />,
  },
  {
    title: "Una historia clínica que sólo ves tú",
    description: `Antecedentes, evoluciones con el formato de tu especialidad, escalas que se califican solas y archivos. Ni el soporte de ${APP_NAME} puede abrirla.`,
    visual: <ClinicalVisual />,
  },
  {
    title: "Cobro por transferencia",
    description: "Tu paciente ve tus datos bancarios y te sube el comprobante desde su celular. Tú marcas la cita como pagada.",
    visual: <PaymentVisual />,
  },
  {
    title: "Tus citas, en el calendario de tu celular",
    description: "Si lo activas, cada cita te llega como invitación para Google, iPhone u Outlook, y se actualiza si cambia o se cancela.",
    visual: <CalendarVisual />,
  },
  {
    title: "Clínicas con varias agendas",
    description: "Cada profesional con su agenda, y cada persona del equipo con su rol y sólo lo que le toca ver.",
    visual: <TeamVisual />,
  },
];

/** Una función o una casilla del día a día: su ilustración y, debajo, la raya tomate, el título y el texto. */
export function FeatureItem({ title, description, visual }: { title: string; description: string; visual: ReactNode }) {
  return (
    <article>
      <div aria-hidden className="flex h-64 items-center justify-center rounded-[1.5rem] bg-muted/60 px-5 sm:h-72 sm:px-10">
        {visual}
      </div>
      <div className="mt-6 px-1">
        <FeatureMark />
        <h3 className="font-display mt-4 text-xl leading-tight font-bold tracking-[-0.02em] sm:text-[1.375rem]">{title}</h3>
        <p className="mt-2 max-w-[48ch] leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </article>
  );
}

/**
 * «Lo que hace por ti mientras atiendes» (spec 043): las ocho funciones en dos columnas, cada una con su
 * ilustración de ejemplo, su raya tomate, su título y su texto.
 */
export function FeaturesSection() {
  return (
    <section aria-labelledby="titulo-funciones" id={LANDING_SECTIONS.features} className={cn(CONTAINER, "pt-14 sm:pt-20")}>
      <SectionHeading id="titulo-funciones" title="Lo que hace por ti mientras atiendes." className="px-1">
        Tus pacientes reservan solos, el sistema les recuerda la cita y tú ves en qué va cada una, sin perseguir a nadie.
      </SectionHeading>
      <div className="mt-12 grid gap-x-10 gap-y-14 md:grid-cols-2 lg:gap-x-14 lg:gap-y-20">
        {FEATURES.map((feature) => (
          <FeatureItem key={feature.title} {...feature} />
        ))}
      </div>
      <p className="mt-10 px-1 text-sm text-muted-foreground">Las ilustraciones usan datos de ejemplo.</p>
    </section>
  );
}
