import { CalendarSync, ChartColumn, Download, FileCheck2, FileSpreadsheet, FolderLock, Landmark, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants/app";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER, SECTION_SPACING, SectionHeading } from "./section-heading";

/** Una etiqueta pequeña de la app (un archivo, un rol, un formato): decorativa. */
function Chip({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground">
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

/**
 * Las seis funciones (spec 032), sólo lo que existe en la app, con los textos de la spec 030: cada una con
 * su icono y, al pie, las etiquetas que se ven en la app (decorativas).
 */
const FEATURES: { icon: LucideIcon; title: string; description: string; chips: { icon?: LucideIcon; label: string }[] }[] = [
  {
    icon: FolderLock,
    title: "Una historia clínica que sólo ves tú",
    description: `Antecedentes, evoluciones con el formato de tu especialidad y archivos. Ni el soporte de ${APP_NAME} puede abrirla, y cada acceso queda registrado.`,
    chips: [{ label: "PHQ-9" }, { label: "GAD-7" }, { label: "Odontograma" }],
  },
  {
    icon: CalendarSync,
    title: "Tus citas, en el calendario de tu celular",
    description: "Si lo activas, cada cita te llega como invitación para Google, iPhone u Outlook, y se actualiza si cambia o se cancela.",
    chips: [{ label: "Google" }, { label: "iPhone" }, { label: "Outlook" }],
  },
  {
    icon: Landmark,
    title: "Cobro por transferencia",
    description: "Tu paciente ve tus datos bancarios y te sube el comprobante desde su celular. Tú marcas la cita como pagada.",
    chips: [{ icon: FileCheck2, label: "comprobante.jpg" }],
  },
  {
    icon: Users,
    title: "Clínicas con varias agendas",
    description: "Cada profesional con su agenda, y cada persona del equipo con su rol y sólo lo que le toca ver.",
    chips: [{ label: "Administrador" }, { label: "Recepción" }, { label: "Profesional" }],
  },
  {
    icon: ChartColumn,
    title: "Reportes de tu consulta",
    description: "Tus citas y tus ingresos estimados del mes o del periodo que elijas, los días y horas más pedidos y los pacientes que no volvieron.",
    chips: [{ label: "Por mes" }, { label: "Imprimir o PDF" }],
  },
  {
    icon: Download,
    title: "Tus datos, cuando quieras",
    description: "Descargas tus pacientes y tus citas en Excel, y las historias clínicas con sus archivos.",
    chips: [
      { icon: FileSpreadsheet, label: "pacientes.xlsx" },
      { icon: FileSpreadsheet, label: "citas.xlsx" },
    ],
  },
];

/**
 * Lo que tu consulta necesita además de la agenda (spec 032), en lugar de la cuadrícula de funciones del
 * ejemplo: seis tarjetas blancas sobre el lienzo, de tres en tres en el computador, de dos en tablet y una
 * debajo de otra en el celular.
 */
export function HighlightsSection() {
  return (
    <section id={LANDING_SECTIONS.highlights} aria-labelledby="funciones-titulo" className={SECTION_SPACING}>
      <div className={CONTAINER}>
        <SectionHeading
          id="funciones-titulo"
          align="center"
          title="Lo que tu consulta necesita, además de la agenda"
          description={`${APP_NAME} reúne lo que hoy tienes en cuadernos, chats y hojas de cálculo.`}
        />

        <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {FEATURES.map(({ icon: Icon, title, description, chips }) => (
            <li key={title} className="flex flex-col rounded-2xl bg-card p-6 shadow-sheet sm:p-7">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-ink">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg leading-snug font-semibold tracking-[-0.01em]">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
              <span aria-hidden className="mt-auto flex flex-wrap gap-1.5 pt-5">
                {chips.map((chip) => (
                  <Chip key={chip.label} icon={chip.icon}>
                    {chip.label}
                  </Chip>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
