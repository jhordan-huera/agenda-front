import { BellRing, CircleCheck, ClipboardCheck, FileCheck2, Globe, Landmark, Mail, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER, SECTION_SPACING, SectionHeading } from "./section-heading";

type Stage = "pending" | "confirmed" | "done" | "paid";

interface SampleAppointment {
  /** El paciente a medias, como en los avisos (constitución, principio II). */
  name: string;
  service: string;
  when: string;
  /** Lo que se ve en la tarjeta además de la cita: de dónde vino, si confirmó, el comprobante… */
  tag?: { icon: LucideIcon; label: string; tone?: "confirmed" };
}

/**
 * El recorrido de una cita en cuatro columnas (spec 032), con citas de ejemplo: las reservas online nacen
 * «Por confirmar» (las del panel, ya confirmadas); al atenderlas pasan a «Atendidas» y, con el pago, a
 * «Pagadas». La cifra de cada columna es la de sus tarjetas. Es una ilustración: la app no tiene esta
 * pantalla ni se arrastran las citas.
 */
const STAGES: { stage: Stage; title: string; appointments: SampleAppointment[] }[] = [
  {
    stage: "pending",
    title: "Por confirmar",
    appointments: [
      { name: "Ana T.", service: "Consulta psicológica", when: "Jue 8 · 10:00", tag: { icon: Globe, label: "Reserva online" } },
      { name: "Lucía M.", service: "Primera consulta", when: "Vie 9 · 15:00", tag: { icon: Globe, label: "Reserva online" } },
    ],
  },
  {
    stage: "confirmed",
    title: "Confirmadas",
    appointments: [
      { name: "Carlos P.", service: "Consulta psicológica", when: "Jue 8 · 09:00", tag: { icon: CircleCheck, label: "Confirmó que va", tone: "confirmed" } },
      { name: "Sofía M.", service: "Seguimiento", when: "Vie 9 · 11:00", tag: { icon: Mail, label: "Recordatorio enviado" } },
      { name: "Daniel G.", service: "Consulta psicológica", when: "Vie 9 · 13:00" },
    ],
  },
  {
    stage: "done",
    title: "Atendidas",
    appointments: [
      { name: "María L.", service: "Consulta psicológica", when: "Lun 5 · 08:00", tag: { icon: FileCheck2, label: "Comprobante recibido" } },
      { name: "Diego S.", service: "Seguimiento", when: "Mar 6 · 12:00" },
    ],
  },
  {
    stage: "paid",
    title: "Pagadas",
    appointments: [
      { name: "Jorge R.", service: "Primera consulta", when: "Lun 5 · 10:00", tag: { icon: Landmark, label: "Transferencia" } },
      { name: "Sofía M.", service: "Seguimiento", when: "Mié 7 · 08:00" },
    ],
  },
];

/**
 * La marca de cada columna, en la gama de la semana de la Agenda (components/shared/week-sample.tsx): lo
 * pendiente con el borde punteado, lo confirmado en el color de la marca, lo atendido en gris y lo pagado en
 * el color de la marca lleno.
 */
const STAGE_MARK: Record<Stage, string> = {
  pending: "border-[1.5px] border-dashed border-ink/60",
  confirmed: "bg-ink/25 ring-[1.5px] ring-ink ring-inset",
  done: "bg-muted-foreground/40",
  paid: "bg-ink",
};

/** Las tres funciones que mueven la cita de una columna a la otra. */
const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: CircleCheck,
    title: "«Confirmo que voy»",
    description: "Tu paciente confirma desde el recordatorio con un toque, sin crear cuenta, y lo ves en la cita.",
  },
  {
    icon: BellRing,
    title: "Recordatorios automáticos",
    description: "Antes de cada cita sale un recordatorio por email, con las horas de anticipación que elijas.",
  },
  {
    icon: ClipboardCheck,
    title: "«Por cerrar»",
    description: "Las citas que ya pasaron y siguen abiertas te esperan en «Por cerrar»: marcas si vino o no, y tus reportes del mes salen reales.",
  },
];

/**
 * Si el contenido de la caja se sale a lo ancho (el tablero en el celular): sólo entonces la caja entra en
 * el orden del teclado, para deslizarla con las flechas. En el computador cabe y no es una parada más.
 */
function useOverflowsX(ref: RefObject<HTMLElement | null>) {
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return overflows;
}

function AppointmentCard({ appointment, stage }: { appointment: SampleAppointment; stage: Stage }) {
  const { name, service, when, tag } = appointment;
  return (
    <li
      className={cn(
        "rounded-lg bg-card p-3 text-left",
        stage === "pending" ? "border border-dashed border-ink/45" : "shadow-sheet",
      )}
    >
      <p className="text-xs text-muted-foreground tabular-nums">{when}</p>
      <p className={cn("mt-1 truncate text-sm font-semibold", stage === "done" ? "text-muted-foreground" : "text-foreground")}>{name}</p>
      <p className="text-[13px] leading-snug text-muted-foreground">{service}</p>
      {tag && (
        <p
          className={cn(
            "mt-2.5 flex w-fit max-w-full items-start gap-1 rounded-md px-1.5 py-0.5 text-xs leading-snug font-medium",
            tag.tone === "confirmed" ? "bg-confirmed/10 text-confirmed" : "bg-muted text-muted-foreground",
          )}
        >
          <tag.icon className="mt-px size-3.5 shrink-0" aria-hidden />
          {tag.label}
        </p>
      )}
    </li>
  );
}

/**
 * «Cada cita, de la reserva al cobro» (spec 032), en lugar del embudo de ventas del ejemplo: el tablero de
 * cuatro columnas en una hoja blanca y, al lado (debajo en el celular), las tres funciones que mueven la
 * cita. En el celular las columnas se deslizan dentro de su caja, nunca la página. Las columnas y sus
 * tarjetas son listas de verdad: el lector de pantalla lee el ejemplo, anunciado como tal.
 */
export function AppointmentFlowSection() {
  const boardRef = useRef<HTMLDivElement>(null);
  const scrollable = useOverflowsX(boardRef);
  return (
    <section id={LANDING_SECTIONS.flow} aria-labelledby="flujo-titulo" className={cn("border-y border-border bg-card", SECTION_SPACING)}>
      <div className={CONTAINER}>
        <SectionHeading
          id="flujo-titulo"
          title="Cada cita, de la reserva al cobro"
          description="Ves en qué va cada cita sin preguntar a nadie: quién reservó, quién confirmó, a quién ya atendiste y quién ya pagó."
        />

        {/* Al lado desde 1280 px: antes, las cuatro columnas no caben junto a las funciones. */}
        <div className="mt-12 grid grid-cols-1 gap-10 sm:mt-14 xl:grid-cols-12 xl:gap-8">
          <figure className="min-w-0 xl:col-span-8">
            {/* `relative`: así los textos sólo para el lector de pantalla (posición absoluta) quedan dentro de la caja y no ensanchan la página. */}
            <div
              ref={boardRef}
              role="region"
              aria-label="Ejemplo: cuatro columnas con las citas por confirmar, confirmadas, atendidas y pagadas"
              tabIndex={scrollable ? 0 : undefined}
              className="relative overflow-x-auto overscroll-x-contain rounded-2xl bg-canvas p-2.5 ring-1 ring-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-3"
            >
              <div className="grid min-w-[42rem] grid-cols-4 gap-2.5 sm:gap-3">
                {STAGES.map(({ stage, title, appointments }) => (
                  <div key={stage} className="flex flex-col">
                    <h3 className="flex items-center gap-1.5 px-1 pt-1 pb-2.5 text-sm font-semibold whitespace-nowrap">
                      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", STAGE_MARK[stage])} />
                      {title}
                      <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums shadow-sheet">
                        <span className="sr-only">, </span>
                        {appointments.length}
                        <span className="sr-only"> {appointments.length === 1 ? "cita" : "citas"}</span>
                      </span>
                    </h3>
                    <ul className="space-y-2">
                      {appointments.map((appointment) => (
                        <AppointmentCard key={`${appointment.name}-${appointment.when}`} appointment={appointment} stage={stage} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <figcaption className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Ilustración del recorrido de una cita. Datos de ejemplo.</span>
              {scrollable && <span aria-hidden>Desliza para ver las cuatro columnas</span>}
            </figcaption>
          </figure>

          <ul className="grid grid-cols-1 content-start gap-8 sm:grid-cols-3 xl:col-span-4 xl:grid-cols-1 xl:gap-9 xl:pt-1">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4 sm:flex-col xl:flex-row">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg leading-snug font-semibold">{title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
