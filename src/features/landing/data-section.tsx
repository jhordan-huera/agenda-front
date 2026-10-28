import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { revealRef } from "./landing-motion";
import { revealDelay, SECONDARY_BUTTON, TECH_LABEL, WIDE_HEADING } from "./landing-styles";
import { Accent, SectionBar, SectionIntro } from "./landing-ui";

/** Lo que cuida Agenda360 de cada consulta: todo cierto hoy (specs 025 y 028; la LOPDP, sólo en /privacidad). */
const PROMISES = [
  {
    letter: "A",
    title: "Descargas todo",
    description: "Tus pacientes y tus citas en Excel, y las historias clínicas con sus archivos, cuando quieras.",
  },
  {
    letter: "B",
    title: "Historia clínica privada",
    description: `Sólo tú y las personas que autorices. Ni el soporte de ${APP_NAME} puede abrirla, y cada acceso queda registrado.`,
    link: { label: "Cómo cuidamos tus datos", to: "/privacidad" },
  },
  {
    letter: "C",
    title: "Sin cuentas para tus pacientes",
    description: "Reservan con su cédula, su nombre y su email. No instalan nada ni recuerdan otra contraseña.",
  },
];

/**
 * 02 / Tus datos (prueba en dev, 2026-10-27), como «Ownership» de getartcraft.com: el título grande y tres
 * columnas A, B y C, que aparecen escalonadas al llegar.
 */
export function DataSection() {
  return (
    <section aria-labelledby="titulo-datos" id={LANDING_SECTIONS.data}>
      <SectionBar index="02" title="Tus datos" note="Lo que no negociamos" />
      <SectionIntro
        id="titulo-datos"
        title={
          <>
            Tus pacientes son <Accent>tuyos</Accent>.
          </>
        }
      >
        Tu consulta no queda atrapada: te llevas todo cuando quieras y la historia clínica sólo la abre quien tú autorizas.
      </SectionIntro>
      <div className="grid border-b border-border md:grid-cols-3">
        {PROMISES.map((promise, index) => (
          <div
            key={promise.letter}
            ref={revealRef}
            data-reveal
            style={revealDelay(index * 120)}
            className="flex flex-col gap-3 border-border p-6 not-last:border-b sm:p-8 md:not-last:border-r md:not-last:border-b-0"
          >
            <p className={cn(TECH_LABEL, "text-muted-foreground")}>{promise.letter}</p>
            <h3 className={cn(WIDE_HEADING, "mt-4 text-xl font-bold tracking-[-0.02em] [font-stretch:108%]")}>{promise.title}</h3>
            <p className="leading-relaxed text-muted-foreground">{promise.description}</p>
            {promise.link && (
              <Link to={promise.link.to} className={cn(SECONDARY_BUTTON, "mt-2 min-h-10 self-start px-4")}>
                {promise.link.label} <ArrowUpRight aria-hidden className="size-3.5" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
