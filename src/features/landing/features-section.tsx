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
import { revealAndPlayRef } from "./landing-motion";
import { revealDelay, TECH_LABEL, WIDE_HEADING } from "./landing-styles";
import { Accent, SectionBar, SectionIntro } from "./landing-ui";

/** Las funciones, con los textos de la portada anterior (spec 032), ya comprobados contra lo que hace Agenda360. */
const FEATURES: { label: string; title: string; description: string; visual: ReactNode }[] = [
  {
    label: "Reservas",
    title: "Tu página de reservas",
    description: "Compartes tu enlace y tus pacientes eligen el servicio y una hora libre, a cualquier hora. No crean cuenta ni descargan nada.",
    visual: <BookingVisual />,
  },
  {
    label: "Recordatorios",
    title: "Recordatorios antes de cada cita",
    description: "Salen solos por email, con las horas de anticipación que elijas y el botón «Confirmo que voy».",
    visual: <ReminderVisual />,
  },
  {
    label: "Tablero",
    title: "Cada cita, de la reserva al cobro",
    description: "Por confirmar, confirmadas, atendidas y pagadas. Mueves la cita de columna y Agenda360 hace lo de siempre: el aviso al paciente y la actividad.",
    visual: <BoardVisual />,
  },
  {
    label: "Agenda",
    title: "Día, semana y mes",
    description: "Tu agenda y la de tu equipo, cada profesional con su color. Para mover una cita, la arrastras.",
    visual: <WeekVisual />,
  },
  {
    label: "Historia clínica",
    title: "Una historia clínica que sólo ves tú",
    description: `Antecedentes, evoluciones con el formato de tu especialidad, escalas que se califican solas y archivos. Ni el soporte de ${APP_NAME} puede abrirla.`,
    visual: <ClinicalVisual />,
  },
  {
    label: "Pagos",
    title: "Cobro por transferencia",
    description: "Tu paciente ve tus datos bancarios y te sube el comprobante desde su celular. Tú marcas la cita como pagada.",
    visual: <PaymentVisual />,
  },
  {
    label: "Calendario",
    title: "Tus citas, en el calendario de tu celular",
    description: "Si lo activas, cada cita te llega como invitación para Google, iPhone u Outlook, y se actualiza si cambia o se cancela.",
    visual: <CalendarVisual />,
  },
  {
    label: "Equipo",
    title: "Clínicas con varias agendas",
    description: "Cada profesional con su agenda, y cada persona del equipo con su rol y sólo lo que le toca ver.",
    visual: <TeamVisual />,
  },
];

/**
 * 01 / Funciones (prueba en dev, 2026-10-27), como la rejilla de getartcraft.com: dos columnas de casillas,
 * cada una con su barra («RESERVAS · 01»), su ilustración en movimiento y su texto. Cada casilla aparece al
 * llegar y su ilustración sólo corre mientras se ve.
 */
export function FeaturesSection() {
  return (
    <section aria-labelledby="titulo-funciones" id={LANDING_SECTIONS.features}>
      <SectionBar index="01" title="Funciones" note="Ilustraciones · datos de ejemplo" />
      <SectionIntro
        id="titulo-funciones"
        title={
          <>
            Todo lo que pasa entre la <Accent>reserva</Accent> y el cobro.
          </>
        }
      >
        Tus pacientes reservan solos, el sistema les recuerda la cita y tú ves en qué va cada una, sin perseguir a nadie.
      </SectionIntro>
      <div className="grid md:grid-cols-2">
        {FEATURES.map((feature, index) => (
          <article
            key={feature.label}
            ref={revealAndPlayRef}
            data-reveal
            style={revealDelay((index % 2) * 120)}
            className="flex flex-col border-b border-border md:odd:border-r"
          >
            <header className={cn(TECH_LABEL, "flex h-11 items-center justify-between border-b border-border px-5 text-muted-foreground sm:px-8")}>
              <span>{feature.label}</span>
              <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
            </header>
            <div aria-hidden className="lv flex h-64 items-center justify-center overflow-hidden bg-canvas px-5 sm:h-72 sm:px-10">
              {feature.visual}
            </div>
            <div className="p-5 sm:p-8">
              <h3 className={cn(WIDE_HEADING, "text-xl leading-tight font-bold tracking-[-0.02em] [font-stretch:108%] sm:text-2xl")}>{feature.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
