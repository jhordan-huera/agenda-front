import { BarChart3, BellRing, CalendarDays, Globe, Layers, Users, type LucideIcon } from "lucide-react";
import { SectionHeading } from "./section-heading";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: CalendarDays,
    title: "Agenda inteligente",
    description: "Vistas de día, semana y mes. Evita solapamientos y bloquea tus horarios libres en segundos.",
  },
  {
    icon: Users,
    title: "Gestión de clientes",
    description: "Ficha de cada cliente con historial de citas, notas privadas y total facturado.",
  },
  {
    icon: Globe,
    title: "Reservas online",
    description: "Tu propia página pública: tus clientes eligen servicio, día y hora disponible sin llamarte.",
  },
  {
    icon: BellRing,
    title: "Recordatorios",
    description: "Reduce las ausencias con recordatorios automáticos antes de cada cita.",
  },
  {
    icon: Layers,
    title: "Servicios",
    description: "Define duración y precio de cada servicio. La disponibilidad se calcula sola.",
  },
  {
    icon: BarChart3,
    title: "Estadísticas",
    description: "Citas completadas, cancelaciones, ausencias e ingresos estimados de un vistazo.",
  },
];

export function FeaturesSection() {
  return (
    <section id="caracteristicas" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Características"
          title="Todo lo que necesitas para gestionar tu agenda"
          description="Herramientas simples, pensadas para que dediques tu tiempo a tus clientes y no a organizar papeles."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border bg-background p-6 transition-shadow hover:shadow-md hover:shadow-primary/5"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
