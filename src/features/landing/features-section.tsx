import type { ReactNode } from "react";
import { AgendaWeek } from "@/features/auth/agenda-week";
import { APP_NAME } from "@/lib/constants/app";
import { PhoneBooking } from "./phone-booking";
import { SectionHeading } from "./section-heading";

/** Lo que hace la app, separado por quién lo usa: el profesional y sus clientes, cada uno con su pantalla. */
const AUDIENCES: { title: string; visual: ReactNode; items: { title: string; description: string }[] }[] = [
  {
    title: "Para ti",
    visual: <AgendaWeek />,
    items: [
      {
        title: "Tu día de un vistazo",
        description: "Agenda por día, semana o mes. Bloquea el almuerzo o tus vacaciones y nadie reserva esas horas.",
      },
      {
        title: "Cada cliente, una ficha",
        description: "Identificado por su cédula, con su historial de citas, notas privadas y lo que te ha pagado.",
      },
      {
        title: "Historia clínica",
        description: "Para consultorios de salud: antecedentes y evoluciones de cada paciente, listas para imprimir.",
      },
    ],
  },
  {
    title: "Para tus clientes",
    visual: <PhoneBooking />,
    items: [
      {
        title: "Reservan sin crear cuenta",
        description: "Eligen servicio, día y hora libre desde el celular. Si ya te visitaron, basta con su cédula.",
      },
      {
        title: "Recordatorio antes de la cita",
        description: "Les llega un email antes de la cita, con la dirección y el enlace para llegar en Google Maps.",
      },
      {
        title: "Atención a domicilio",
        description: "Marcan en el mapa el lugar exacto donde los visitas.",
      },
    ],
  },
];

export function FeaturesSection() {
  return (
    <section id="caracteristicas" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title="Menos mensajes para cuadrar una hora"
          description={`${APP_NAME} responde por ti la pregunta de siempre: «¿tiene un espacio el jueves?».`}
        />
        <div className="mt-14 grid gap-14 md:grid-cols-2 md:gap-10">
          {AUDIENCES.map((audience) => (
            <div key={audience.title}>
              <div className="flex min-h-[25rem] items-center justify-center overflow-hidden rounded-2xl bg-muted px-5 py-10 sm:px-8 md:h-[35rem]">
                <div className="flex w-full max-w-md justify-center [&_figure]:w-full [&_figure]:-rotate-1 [&_figure]:shadow-[0_28px_56px_-30px_rgb(29_36_51/0.35)]">
                  {audience.visual}
                </div>
              </div>
              <h3 className="mt-8 border-b-2 border-ink pb-3 text-xl font-bold text-ink">{audience.title}</h3>
              <dl className="divide-y">
                {audience.items.map((item) => (
                  <div key={item.title} className="py-4">
                    <dt className="font-semibold">{item.title}</dt>
                    <dd className="mt-1 leading-relaxed text-muted-foreground">{item.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
