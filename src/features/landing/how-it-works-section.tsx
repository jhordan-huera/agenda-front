import { CalendarCheck, Settings2, Share2, type LucideIcon } from "lucide-react";
import { SectionHeading } from "./section-heading";

const STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Settings2,
    title: "Configura tu negocio",
    description: "Añade tus servicios, precios y horarios de atención. Te guiamos paso a paso.",
  },
  {
    icon: Share2,
    title: "Comparte tu enlace",
    description: "Recibe tu página de reservas personalizada y compártela por email, redes sociales o en tu web.",
  },
  {
    icon: CalendarCheck,
    title: "Recibe reservas",
    description: "Tus clientes reservan en las horas libres y tú lo ves todo en tu agenda al instante.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="scroll-mt-20 border-y bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Cómo funciona"
          title="Empieza a recibir reservas en 3 pasos"
        />
        <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
          <div aria-hidden className="absolute top-8 right-[16%] left-[16%] hidden h-px bg-border md:block" />
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="relative flex flex-col items-center text-center">
              <span className="relative flex size-16 items-center justify-center rounded-2xl border bg-background shadow-sm">
                <Icon className="size-6 text-primary" aria-hidden />
                <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
              </span>
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
