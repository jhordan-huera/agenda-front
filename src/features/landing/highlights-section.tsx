import { CircleCheck, FileCheck2, FileSpreadsheet, FolderLock, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER, SectionHeading } from "./section-heading";
import { Sheet } from "./sheet";

/** Un trozo de la app dentro de un bloque: hundido en la pared, un tono por debajo del papel. */
const INSET = "rounded-xl bg-wall ring-1 ring-border";

/** El puntaje PHQ-9 de un paciente en cinco sesiones (datos de ejemplo): de 19 (moderadamente severa) a 6 (leve). */
const PHQ9 = [19, 15, 12, 9, 6];
const SESSIONS = ["12 ago", "26 ago", "9 sep", "23 sep", "7 oct"];
const PHQ9_TOP = 20;
const pointX = (index: number) => (index / (PHQ9.length - 1)) * 100;
const pointY = (score: number) => 100 - (score / PHQ9_TOP) * 100;

/**
 * El gráfico de la evolución (features/clinical/clinical-evolution-chart.tsx), estático: una sola serie en
 * el azul de la marca, la cuadrícula apenas visible y sólo el primer y el último valor escritos. La línea va
 * en un SVG que se estira; los puntos y los textos, en HTML, para que no se deformen a ningún ancho.
 */
function Phq9Sample() {
  return (
    <div role="img" aria-label="Ejemplo: el puntaje PHQ-9 de un paciente baja de 19 a 6 en cinco sesiones" className={cn(INSET, "p-4 sm:p-5")}>
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">PHQ-9</span>
        <span className="text-xs text-muted-foreground">Puntaje por sesión</span>
      </p>
      <div className="relative mt-9 mr-4 ml-7 h-28">
        {[0, 10, 20].map((score) => (
          <span key={score} className="absolute inset-x-0 border-t border-border" style={{ top: `${pointY(score)}%` }}>
            <span className="absolute -left-7 w-5 -translate-y-1/2 text-right text-[11px] text-muted-foreground tabular-nums">{score}</span>
          </span>
        ))}
        <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={PHQ9.map((score, index) => `${pointX(index)},${pointY(score)}`).join(" ")}
            fill="none"
            className="stroke-ink"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {PHQ9.map((score, index) => (
          <span
            key={SESSIONS[index]}
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card ring-2 ring-ink"
            style={{ left: `${pointX(index)}%`, top: `${pointY(score)}%` }}
          />
        ))}
        <span
          className="absolute translate-x-2.5 -translate-y-[125%] text-xs font-semibold tabular-nums"
          style={{ left: `${pointX(0)}%`, top: `${pointY(PHQ9[0])}%` }}
        >
          {PHQ9[0]}
        </span>
        <span
          className="absolute translate-x-[-100%] translate-y-2.5 text-xs whitespace-nowrap tabular-nums"
          style={{ left: `${pointX(PHQ9.length - 1)}%`, top: `${pointY(PHQ9[PHQ9.length - 1])}%` }}
        >
          <span className="font-semibold">{PHQ9[PHQ9.length - 1]}</span> <span className="text-muted-foreground">leve</span>
        </span>
      </div>
      <div className="relative mt-2 mr-4 ml-7 h-4 text-[11px] text-muted-foreground tabular-nums">
        {SESSIONS.map((session, index) => (
          <span key={session} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pointX(index)}%` }}>
            {session}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Quién puede abrir la historia clínica (spec 025): el propietario, quien él autoriza y nadie más. */
const ACCESS = [
  { who: "Tú", access: "Siempre" },
  { who: "Quien autorices de tu equipo", access: "Con tu permiso" },
  { who: `El soporte de ${APP_NAME}`, access: "Nunca" },
];

function AccessSample() {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Lock className="size-4 text-ink" aria-hidden />
        Quién puede abrirla
      </p>
      <ul className="mt-2 divide-y divide-border border-t border-border text-sm">
        {ACCESS.map(({ who, access }) => (
          <li key={who} className="flex items-center justify-between gap-4 py-2.5">
            <span>{who}</span>
            <span className="shrink-0 text-muted-foreground">{access}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Una etiqueta pequeña de la app (un archivo, un rol). */
function Chip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-wall px-2.5 text-[13px] font-medium ring-1 ring-border [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

function BlockTitle({ size, children }: { size: "lg" | "md" | "sm"; children: ReactNode }) {
  return (
    <h3
      className={cn(
        "font-semibold tracking-[-0.02em]",
        size === "lg" && "text-[1.5625rem] leading-tight",
        size === "md" && "text-xl leading-snug",
        size === "sm" && "text-lg leading-snug",
      )}
    >
      {children}
    </h3>
  );
}

/**
 * Lo que distingue a Agenda360 (spec 030), sólo lo que existe en la app: un bloque grande (la historia
 * clínica privada), dos medianos («Confirmo que voy» y las invitaciones de calendario) y tres pequeños
 * (el cobro por transferencia, las clínicas y la descarga de los datos). Cada uno, con un trozo de la app
 * en lugar de un icono. Los trozos son decorativos salvo el gráfico, que tiene su descripción.
 */
export function HighlightsSection() {
  return (
    <section id={LANDING_SECTIONS.highlights} aria-labelledby="funciones-titulo" className="border-y border-border bg-counter py-16 sm:py-24">
      <div className={CONTAINER}>
        <SectionHeading
          id="funciones-titulo"
          title={`Lo que distingue a ${APP_NAME}`}
          description="Lo que un consultorio necesita además de la agenda. Los ejemplos usan datos de prueba."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 md:grid-cols-6 lg:grid-cols-12 lg:gap-5">
          <Sheet className="flex flex-col gap-6 p-6 sm:p-8 md:col-span-6 lg:col-span-7 lg:row-span-2">
            <div>
              <BlockTitle size="lg">Una historia clínica que sólo ves tú</BlockTitle>
              <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
                Antecedentes, evoluciones con el formato de tu especialidad y archivos. Los cuestionarios{" "}
                <span className="whitespace-nowrap">PHQ-9</span> y <span className="whitespace-nowrap">GAD-7</span> se califican solos y
                ves cómo cambian en un gráfico. Cada acceso queda registrado.
              </p>
            </div>
            <Phq9Sample />
            <div aria-hidden className="mt-auto">
              <AccessSample />
            </div>
          </Sheet>

          <Sheet className="flex flex-col gap-5 p-6 md:col-span-3 lg:col-span-5">
            <div>
              <BlockTitle size="md">«Confirmo que voy»</BlockTitle>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Antes de la cita, tu paciente recibe un recordatorio por email. Con un toque confirma que va, y lo ves en tu agenda.
              </p>
            </div>
            <div aria-hidden className="mt-auto space-y-3">
              <div className={cn(INSET, "flex flex-wrap items-center justify-between gap-3 p-4")}>
                <span>
                  <span className="block text-xs text-muted-foreground">Recordatorio de tu cita</span>
                  <span className="mt-0.5 block text-sm font-semibold">Mañana a las 11:00</span>
                </span>
                <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[13px] font-semibold whitespace-nowrap text-primary-foreground">
                  Confirmo que voy
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-confirmed/10 px-2.5 py-1 text-xs font-semibold text-confirmed">
                <CircleCheck className="size-3.5" /> Confirmó el paciente
              </span>
            </div>
          </Sheet>

          <Sheet className="flex flex-col gap-5 p-6 md:col-span-3 lg:col-span-5">
            <div>
              <BlockTitle size="md">Tus citas, en el calendario de tu celular</BlockTitle>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Si lo activas, cada cita te llega como invitación para Google, iPhone u Outlook, y se actualiza si cambia o se cancela.
              </p>
            </div>
            <div aria-hidden className={cn(INSET, "mt-auto flex items-center gap-3 p-3")}>
              <span className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-card py-1 ring-1 ring-border">
                <span className="text-[11px] font-semibold text-ink">oct</span>
                <span className="text-lg leading-tight font-bold tabular-nums">8</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">Consulta psicológica, Ana T.</span>
                <span className="block text-xs text-muted-foreground tabular-nums">11:00 a 11:50, invitación de {APP_NAME}</span>
              </span>
            </div>
          </Sheet>

          <Sheet className="flex flex-col gap-4 p-6 md:col-span-2 lg:col-span-4">
            <BlockTitle size="sm">Cobro por transferencia</BlockTitle>
            <p className="leading-relaxed text-muted-foreground">Tu paciente ve tus datos bancarios y te sube el comprobante desde su celular.</p>
            <span aria-hidden className="mt-auto flex flex-wrap gap-2">
              <Chip icon={<FileCheck2 />}>comprobante.jpg</Chip>
              <Chip>Recibido</Chip>
            </span>
          </Sheet>

          <Sheet className="flex flex-col gap-4 p-6 md:col-span-2 lg:col-span-4">
            <BlockTitle size="sm">Clínicas con varias agendas</BlockTitle>
            <p className="leading-relaxed text-muted-foreground">Cada profesional con su agenda, y cada persona del equipo con su rol.</p>
            <span aria-hidden className="mt-auto flex flex-wrap gap-2">
              <Chip>Administrador</Chip>
              <Chip>Recepción</Chip>
              <Chip>Profesional</Chip>
            </span>
          </Sheet>

          <Sheet className="flex flex-col gap-4 p-6 md:col-span-2 lg:col-span-4">
            <BlockTitle size="sm">Tus datos, cuando quieras</BlockTitle>
            <p className="leading-relaxed text-muted-foreground">Descargas tus pacientes y tus citas en Excel, y las historias clínicas con sus archivos.</p>
            <span aria-hidden className="mt-auto flex flex-wrap gap-2">
              <Chip icon={<FileSpreadsheet />}>pacientes.xlsx</Chip>
              <Chip icon={<FileSpreadsheet />}>citas.xlsx</Chip>
              <Chip icon={<FolderLock />}>historias</Chip>
            </span>
          </Sheet>
        </div>
      </div>
    </section>
  );
}
