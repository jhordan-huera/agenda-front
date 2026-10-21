import { BellRing, Copy, MailCheck, QrCode } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER, SectionHeading } from "./section-heading";
import { Sheet } from "./sheet";

/** Un campo de la app, ya completado (decorativo). */
function SampleField({ label, value }: { label: string; value: string }) {
  return (
    <span className="block">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <span className="mt-1 flex h-10 items-center truncate rounded-lg bg-field px-3 text-sm ring-1 ring-input">{value}</span>
    </span>
  );
}

/** Una fila de lo que pasa después de la reserva. */
function SampleEvent({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-3.5">{icon}</span>
      {children}
    </li>
  );
}

/**
 * Cada paso con lo que la persona ve de verdad en ese momento (datos de ejemplo): la tarjeta de «Tu página
 * de reservas» del Inicio, el paso «Tus datos» de la reserva y la cita ya en la agenda.
 */
const STEPS: { title: string; description: string; sample: ReactNode }[] = [
  {
    title: "Comparte tu enlace",
    description:
      "Escribes tus servicios y tus horarios una sola vez. Después pones el enlace en tu estado de WhatsApp, en Instagram o se lo mandas a quien te pide una cita.",
    sample: (
      <Sheet className="p-5">
        <p className="font-semibold">Tu página de reservas</p>
        <p className="mt-1 text-sm text-muted-foreground">Compártela por WhatsApp para que tus pacientes reserven solos.</p>
        <p className="mt-4 truncate rounded-xl bg-wall px-3 py-2.5 text-sm font-semibold text-ink ring-1 ring-border">
          {typeof window === "undefined" ? "" : window.location.host}/book/paula-rios
        </p>
        <span className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
          <span className="flex h-9 items-center justify-center gap-1.5 rounded-md ring-1 ring-border">
            <Copy className="size-4" /> Copiar
          </span>
          <span className="flex h-9 items-center justify-center gap-1.5 rounded-md ring-1 ring-border">
            <QrCode className="size-4" /> Código QR
          </span>
        </span>
      </Sheet>
    ),
  },
  {
    title: "Tus pacientes reservan",
    description:
      "Ven sólo tus horas libres, eligen la que les sirve y reservan con su cédula, su nombre y su email. No crean cuenta ni descargan nada.",
    sample: (
      <Sheet className="p-5">
        <p className="font-semibold">Tus datos</p>
        <p className="mt-1 text-sm text-muted-foreground">Consulta psicológica, jueves 8 de octubre a las 11:00</p>
        <span className="mt-4 grid gap-3">
          <SampleField label="Número de cédula" value="1712345678" />
          <SampleField label="Nombre completo" value="Ana Torres" />
          <SampleField label="Email" value="ana.torres@email.com" />
        </span>
        <span className="mt-4 flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          Confirmar reserva
        </span>
      </Sheet>
    ),
  },
  {
    title: "Tú atiendes",
    description:
      "La cita llega a tu agenda y te avisamos. Tu paciente recibe un email con su reserva y, antes de la cita, un recordatorio.",
    sample: (
      <Sheet className="p-5">
        <div className="flex items-start gap-4">
          <span className="marker text-[1.75rem] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums">11:00</span>
          <span className="min-w-0">
            <span className="block font-semibold">Ana Torres</span>
            <span className="block text-sm text-muted-foreground">Consulta psicológica, 50 min</span>
          </span>
        </div>
        <ul className="mt-4 divide-y divide-border border-t border-border">
          <SampleEvent icon={<BellRing />}>Te avisamos de la reserva</SampleEvent>
          <SampleEvent icon={<MailCheck />}>Ana recibió el email de su reserva</SampleEvent>
          <SampleEvent icon={<MailCheck />}>El recordatorio sale antes de la cita</SampleEvent>
        </ul>
      </Sheet>
    ),
  },
];

/**
 * Cómo funciona (spec 030): tres pasos (es una secuencia, por eso van numerados) en renglones, como las
 * líneas de una agenda, alternando el texto y el trozo de la app, que va directo sobre la pared como las
 * hojas de la portada. En el celular, el texto siempre arriba.
 */
export function HowItWorksSection() {
  return (
    <section id={LANDING_SECTIONS.howItWorks} aria-labelledby="como-funciona-titulo" className="bg-wall py-16 sm:py-24">
      <div className={CONTAINER}>
        <SectionHeading
          id="como-funciona-titulo"
          title="Así funciona"
          description="De tu enlace a tu agenda, sin mensajes de ida y vuelta para cuadrar la hora."
        />
        <ol className="mt-12 border-b border-rule-strong sm:mt-16">
          {STEPS.map(({ title, description, sample }, index) => {
            const flipped = index % 2 === 1;
            return (
              <li
                key={title}
                className="grid grid-cols-1 items-center gap-8 border-t border-rule-strong py-10 sm:py-12 lg:grid-cols-12 lg:gap-10 lg:py-14"
              >
                <div className={cn("max-w-md lg:col-span-5 lg:row-start-1", flipped ? "lg:col-start-8" : "lg:col-start-1")}>
                  <span
                    aria-hidden
                    className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-ink tabular-nums ring-1 ring-rule-strong"
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">
                    <span className="sr-only">Paso {index + 1}: </span>
                    {title}
                  </h3>
                  <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{description}</p>
                </div>
                <div
                  aria-hidden
                  className={cn(
                    "w-full max-w-sm justify-self-center lg:col-span-5 lg:row-start-1",
                    flipped ? "lg:col-start-1 lg:justify-self-start" : "lg:col-start-8 lg:justify-self-end",
                  )}
                >
                  {sample}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
