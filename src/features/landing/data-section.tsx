import { Link } from "react-router";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER } from "./landing-styles";
import { FeatureMark, SectionHeading } from "./landing-ui";

/** Lo que cuida Agenda360 de cada consulta: todo cierto hoy (specs 025 y 028; la LOPDP, sólo en /privacidad). */
const PROMISES: { title: string; description: string; link?: { label: string; to: string } }[] = [
  {
    title: "Descargas todo",
    description: "Tus pacientes y tus citas en Excel, y las historias clínicas con sus archivos, cuando quieras.",
  },
  {
    title: "Historia clínica privada",
    description: `Sólo tú y las personas que autorices. Ni el soporte de ${APP_NAME} puede abrirla, y cada acceso queda registrado.`,
    link: { label: "Cómo cuidamos tus datos", to: "/privacidad" },
  },
  {
    title: "Sin cuentas para tus pacientes",
    description: "Reservan con su cédula, su nombre y su email. No instalan nada ni recuerdan otra contraseña.",
  },
];

/** «Tus datos» (spec 043): el título a la izquierda y las tres promesas, cada una con su raya tomate. */
export function DataSection() {
  return (
    <section aria-labelledby="titulo-datos" id={LANDING_SECTIONS.data} className={cn(CONTAINER, "pt-24 sm:pt-32")}>
      <div className="grid gap-12 px-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] lg:gap-16">
        <SectionHeading id="titulo-datos" title="Tus pacientes son tuyos.">
          Tu consulta no queda atrapada: te llevas todo cuando quieras y la historia clínica sólo la abre quien tú autorizas.
        </SectionHeading>
        <ul className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {PROMISES.map((promise) => (
            <li key={promise.title}>
              <FeatureMark />
              <h3 className="font-display mt-4 text-lg leading-snug font-bold">{promise.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{promise.description}</p>
              {promise.link && (
                <Link
                  to={promise.link.to}
                  className="mt-3 inline-flex min-h-11 items-center rounded-md font-semibold text-ink underline decoration-ink/40 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {promise.link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
