import { BellRing, Copy, MessageCircle, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { CONTAINER, SECTION_SPACING, SectionHeading } from "./section-heading";

/** Lo que sale solo (o casi): los textos dicen lo que hace la app y nada más. */
const AUTOMATIONS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: BellRing,
    title: "Recordatorios antes de cada cita",
    description: "Salen solos por email, con las horas de anticipación que elijas y el botón «Confirmo que voy».",
  },
  {
    icon: Copy,
    title: "Cada email al paciente, con copia para ti",
    description: "La reserva, los cambios, las cancelaciones y los recordatorios: tu paciente recibe el suyo y a ti te llega una copia.",
  },
  {
    icon: MessageCircle,
    title: "Avisos por WhatsApp, ya escritos",
    description: "Al confirmar, mover o cancelar una cita, el mensaje para tu paciente ya está escrito: sólo lo envías.",
  },
];

/** Los datos de la cita del email, como los escribe la plantilla del recordatorio (src/lib/email/templates.ts). */
const DETAILS = [
  { label: "Servicio", value: "Consulta psicológica" },
  { label: "Profesional", value: "Paula Ríos" },
  { label: "Fecha", value: "Jueves 8 de octubre" },
  { label: "Hora", value: "10:00 a 10:50" },
];

/**
 * El recordatorio que recibe el paciente, en una bandeja de entrada (decorativo): el remitente, el asunto y
 * el email con los textos de la plantilla `appointmentReminder`; debajo, la copia que le llega al
 * profesional. El botón va en el color de la marca (el tomate), como en los emails.
 */
function ReminderPreview({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <div aria-hidden className="rounded-2xl bg-canvas p-2.5 ring-1 ring-border sm:p-5">
        <div className="overflow-hidden rounded-xl bg-card shadow-sheet">
          <div className="flex items-start gap-3 border-b border-border px-4 py-3 sm:px-5">
            <BrandMark className="mt-0.5 size-8" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex items-baseline justify-between gap-3">
                <span className="truncate font-semibold">{APP_NAME}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">Mié 7 · 10:00</span>
              </p>
              <p className="truncate font-medium">Recuerda que tienes una cita mañana</p>
              <p className="truncate text-xs text-muted-foreground">Para: Ana T.</p>
            </div>
          </div>
          <div className="px-4 py-5 sm:px-7 sm:py-6">
            <p className="text-xs font-semibold text-ink">Paula Ríos · Psicología</p>
            <p className="mt-2 text-xl leading-tight font-bold tracking-[-0.02em]">Tu cita es mañana</p>
            <p className="mt-3 text-sm">Hola Ana:</p>
            <p className="mt-1 text-sm text-muted-foreground">Te recordamos tu próxima cita:</p>
            <dl className="mt-4 divide-y divide-border rounded-lg text-sm ring-1 ring-border">
              {DETAILS.map(({ label, value }) => (
                <div key={label} className="flex gap-3 px-3 py-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <span className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              Confirmo que voy
            </span>
            <p className="mt-3 text-sm font-medium text-ink underline decoration-ink/40 underline-offset-4">Ver o cancelar mi cita</p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-sheet sm:mt-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Copy className="size-4" />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold">Copia · Ana T.:</span> Recuerda que tienes una cita mañana
          </p>
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-foreground">Para ti</span>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-muted-foreground">
        <span className="sr-only">
          Ejemplo: el recordatorio que recibe Ana un día antes de su cita del jueves 8 de octubre a las 10:00, con el botón
          «Confirmo que voy», y la copia que le llega a su psicóloga.{" "}
        </span>
        Datos de ejemplo
      </figcaption>
    </figure>
  );
}

/**
 * «Lo repetitivo, en automático» (spec 032), en lugar de la sección de IA del ejemplo (Agenda360 no tiene
 * IA): los recordatorios, los emails con copia al profesional y los avisos por WhatsApp ya escritos, al
 * lado de la vista del email de recordatorio. En el celular, el email va debajo.
 */
export function AutomationSection() {
  return (
    <section aria-labelledby="automatico-titulo" className={cn("border-y border-border bg-card", SECTION_SPACING)}>
      <div className={cn(CONTAINER, "grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-10")}>
        <div className="lg:col-span-5">
          <SectionHeading
            id="automatico-titulo"
            title="Lo repetitivo, en automático"
            description="Mientras atiendes, tus pacientes reciben lo que necesitan saber, y tú, una copia."
          />
          <ul className="mt-10 space-y-7">
            {AUTOMATIONS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
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
        <ReminderPreview className="min-w-0 lg:col-span-6 lg:col-start-7" />
      </div>
    </section>
  );
}
