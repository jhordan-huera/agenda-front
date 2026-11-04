import { CalendarDays, FileSpreadsheet, Mail, MessageCircle, Smartphone, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER, SECTION_SPACING, SectionHeading } from "./section-heading";

/**
 * Los calendarios a los que llegan las invitaciones de las citas (spec 027): por email, sin conectar la
 * cuenta, así que valen para los tres.
 */
const CALENDARS: { icon: LucideIcon; name: string }[] = [
  { icon: CalendarDays, name: "Google Calendar" },
  { icon: Smartphone, name: "Calendario del iPhone" },
  { icon: Mail, name: "Outlook" },
];

/** El cuadrado del icono: el mismo en todas las tarjetas, en la gama de la marca. */
const ICON_BOX = "flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-ink";

function IntegrationCard({ className, children }: { className?: string; children: ReactNode }) {
  return <li className={cn("flex flex-col rounded-2xl bg-card p-5 shadow-sheet sm:p-6", className)}>{children}</li>;
}

/**
 * «Funciona con» (spec 032), en lugar de la cuadrícula de logos del ejemplo, sólo lo real: Google Calendar,
 * el Calendario del iPhone y Outlook (las invitaciones de calendario, juntas porque hacen lo mismo), WhatsApp
 * (el enlace de reservas y los avisos) y Excel (importar pacientes). Con iconos propios, nunca los logos
 * de las marcas, sin decir «oficial» y con la aclaración de que son marcas de sus dueños.
 */
export function IntegrationsSection() {
  return (
    <section id={LANDING_SECTIONS.integrations} aria-labelledby="funciona-con-titulo" className={SECTION_SPACING}>
      <div className={CONTAINER}>
        <SectionHeading
          id="funciona-con-titulo"
          align="center"
          title="Funciona con lo que ya usas"
          description="Sin instalar nada más ni conectar tus cuentas."
        />
        <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-7 lg:gap-5">
          <IntegrationCard className="sm:col-span-2 lg:col-span-3">
            <h3 className="text-lg leading-snug font-semibold">Tus citas, en tu calendario</h3>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">
              Si lo activas, cada cita te llega por email como invitación, y se actualiza si cambia o se cancela.
            </p>
            <ul className="mt-auto grid grid-cols-1 gap-2 pt-5 sm:grid-cols-3">
              {CALENDARS.map(({ icon: Icon, name }) => (
                <li key={name} className="flex items-center gap-3 rounded-xl p-2.5 ring-1 ring-border sm:flex-col sm:items-start">
                  <span className={ICON_BOX}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm leading-snug font-semibold">{name}</span>
                </li>
              ))}
            </ul>
          </IntegrationCard>
          <IntegrationCard className="lg:col-span-2">
            <span className={ICON_BOX}>
              <MessageCircle className="size-5" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg leading-snug font-semibold">WhatsApp</h3>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">
              Compartes tu enlace de reservas y avisas a tus pacientes con el mensaje ya escrito.
            </p>
          </IntegrationCard>
          <IntegrationCard className="lg:col-span-2">
            <span className={ICON_BOX}>
              <FileSpreadsheet className="size-5" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg leading-snug font-semibold">Excel</h3>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">
              Traes tus pacientes desde un Excel y, cuando quieras, descargas tus datos.
            </p>
          </IntegrationCard>
        </ul>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Google Calendar, iPhone, Outlook, WhatsApp y Excel son marcas de sus dueños.
        </p>
      </div>
    </section>
  );
}
