import { BellRing, CheckCheck } from "lucide-react";
import type { ReactNode } from "react";
import { SectionHeading } from "./section-heading";

const BOOKING_PATH = "/book/jhordan";

/** Cada paso con lo que la persona ve de verdad en ese momento. */
const STEPS: { title: string; description: string; sample: ReactNode }[] = [
  {
    title: "Crea tu agenda",
    description: "Escribe tus servicios con su duración y precio, y los horarios en que atiendes. Te toma unos minutos.",
    sample: (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3.5 py-3">
        <span>
          <span className="block font-semibold">Consulta inicial</span>
          <span className="block text-sm text-muted-foreground">1 h, de lunes a viernes</span>
        </span>
        <span className="text-lg font-extrabold tabular-nums">$25</span>
      </div>
    ),
  },
  {
    title: "Comparte tu enlace",
    description: "Ponlo en tu estado de WhatsApp, en Instagram o mándalo a quien te pida una cita.",
    sample: (
      // Burbuja de WhatsApp: es por donde los profesionales ya hablan con sus clientes.
      <div className="ml-auto max-w-[17rem] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3.5 py-2.5 text-sm text-[#111b21] shadow-sm">
        Hola, ya puedes reservar tu cita aquí:{" "}
        <span className="font-semibold break-all text-[#027eb5]">
          {typeof window === "undefined" ? "" : window.location.host}
          {BOOKING_PATH}
        </span>
        <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#667781]">
          09:41 <CheckCheck className="size-3.5 text-[#53bdeb]" aria-label="Leído" />
        </span>
      </div>
    ),
  },
  {
    title: "Recibe las reservas",
    description: "Cada reserva llega a tu agenda y te avisamos por email. Tu cliente recibe la confirmación.",
    sample: (
      <div className="flex items-start gap-3 rounded-lg border bg-background px-3.5 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-highlight text-ink">
          <BellRing className="size-4" aria-hidden />
        </span>
        <span className="text-sm">
          <span className="block font-bold">Nueva reserva online</span>
          <span className="block text-muted-foreground">Ana Torres, jueves a las 10:00</span>
        </span>
      </div>
    ),
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-accent py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading title="Empieza hoy mismo" />
        <ol className="mt-12 grid gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ title, description, sample }, index) => (
            <li key={title} className="flex flex-col border-t-2 border-ink pt-5">
              <span className="block text-5xl leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 max-w-xs leading-relaxed text-muted-foreground">{description}</p>
              <div className="mt-6 md:mt-auto md:pt-6">{sample}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
