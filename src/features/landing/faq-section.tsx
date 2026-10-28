import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS, TESTIMONIAL } from "./landing-constants";
import { revealRef } from "./landing-motion";
import { revealDelay, TECH_LABEL, WIDE_HEADING } from "./landing-styles";
import { Accent, SectionBar, SectionIntro } from "./landing-ui";
import { usePricingContact, type SupportContact } from "./use-signup-contact";

/** Un enlace dentro de una frase: su zona para el dedo crece hasta 44 px de alto sin mover el texto. */
const TEXT_LINK =
  "relative rounded-sm font-semibold text-ink underline decoration-ink/40 underline-offset-4 outline-none before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] hover:decoration-current focus-visible:ring-3 focus-visible:ring-ring/50";

/** «Escríbenos»: el WhatsApp de soporte (en otra pestaña) o su email, con la pregunta ya escrita. */
function ContactLink({ contact, children }: { contact: SupportContact; children: ReactNode }) {
  return (
    <a href={contact.href} className={TEXT_LINK} {...(contact.kind === "whatsapp" ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </a>
  );
}

/**
 * El testimonio de una clienta (spec 032), sólo con su permiso: mientras `TESTIMONIAL` sea `null`
 * (landing-constants.ts), no se dibuja. Una cita grande, con su nombre y su especialidad.
 */
function Testimonial() {
  if (!TESTIMONIAL) return null;
  const { quote, name, role, city } = TESTIMONIAL;
  return (
    <figure id={LANDING_SECTIONS.testimonial} ref={revealRef} data-reveal className="border-b border-border px-5 py-16 sm:px-10 sm:py-20">
      <p className={cn(TECH_LABEL, "text-muted-foreground")}>Lo que dicen</p>
      <blockquote className={cn(WIDE_HEADING, "mt-6 max-w-4xl text-[clamp(1.5rem,3vw,2.25rem)] leading-tight font-bold [font-stretch:105%]")}>
        «{quote}»
      </blockquote>
      <figcaption className="mt-6">
        <span className="block font-semibold">{name}</span>
        <span className="block text-muted-foreground">{[role, city].filter(Boolean).join(", ")}</span>
      </figcaption>
    </figure>
  );
}

/**
 * 03 / Preguntas (prueba en dev, 2026-10-27). Donde getartcraft.com pone las películas de su comunidad,
 * Agenda360 pone las preguntas frecuentes: no hay testimonios inventados (el de una clienta sale antes, sólo
 * con su permiso). Con `<details>` nativo, numeradas como las casillas, y sin precios (constitución).
 */
export function FaqSection() {
  const pricing = usePricingContact();
  const questions: { question: string; answer: ReactNode }[] = [
    {
      question: "¿Cuánto cuesta?",
      answer: (
        <>
          Puedes empezar gratis, sin tarjeta. Para los planes con más funciones,{" "}
          {pricing ? (
            <ContactLink contact={pricing}>{pricing.kind === "whatsapp" ? "escríbenos por WhatsApp" : "escríbenos por email"}</ContactLink>
          ) : (
            "escríbenos"
          )}{" "}
          y te contamos.
        </>
      ),
    },
    {
      question: "¿Mis pacientes tienen que crear una cuenta o descargar algo?",
      answer: "No. Abren tu enlace, eligen la hora y reservan con su cédula, su nombre y su email. Nada más.",
    },
    {
      question: "¿Quién puede ver la historia clínica?",
      answer: `Sólo tú y las personas de tu equipo que autorices. Ni el soporte de ${APP_NAME} puede verla, y cada acceso queda registrado.`,
    },
    {
      question: "¿Sirve para una clínica con varios profesionales?",
      answer: "Sí. Cada profesional tiene su agenda, y cada persona del equipo entra con su rol: administrador, recepción o profesional.",
    },
    {
      question: "¿Puedo traer mis pacientes de un Excel?",
      answer: "Sí, los importas desde un Excel o un CSV. Y cuando quieras, descargas tus pacientes, tus citas y las historias clínicas.",
    },
    {
      question: "¿Hay que instalar una app?",
      answer: `No hace falta: ${APP_NAME} funciona en el navegador del celular y de la computadora. Si prefieres, la instalas como una app desde el navegador, sin pasar por la tienda.`,
    },
    {
      question: "¿Cómo se cuidan los datos de mis pacientes?",
      answer: (
        <>
          Sólo tú y tu equipo los ven, y la historia clínica, sólo quien tiene acceso a ella: ni el soporte de {APP_NAME} puede
          abrirla. Lo explicamos en la{" "}
          <Link to="/privacidad" className={TEXT_LINK}>
            política de privacidad
          </Link>
          .
        </>
      ),
    },
  ];

  return (
    <section aria-labelledby="titulo-preguntas" id={LANDING_SECTIONS.faq}>
      <SectionBar index="03" title="Preguntas" note="Lo que más nos preguntan" />
      <Testimonial />
      <SectionIntro
        id="titulo-preguntas"
        title={
          <>
            Lo que querías <Accent>saber</Accent>.
          </>
        }
      >
        ¿Te queda otra duda? {pricing ? <ContactLink contact={pricing}>Escríbenos</ContactLink> : "Escríbenos"}.
      </SectionIntro>
      <div className="border-b border-border">
        {questions.map(({ question, answer }, index) => (
          <details
            key={question}
            ref={revealRef}
            data-reveal
            style={revealDelay(Math.min(index, 4) * 60)}
            className="group border-border not-last:border-b"
          >
            <summary className="flex min-h-16 cursor-pointer list-none items-center gap-5 px-5 py-4 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:px-8 [&::-webkit-details-marker]:hidden">
              <span className={cn(TECH_LABEL, "w-6 shrink-0 text-muted-foreground tabular-nums")}>{String(index + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-[1.0625rem] font-semibold">{question}</span>
              <Plus
                aria-hidden
                className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out-soft group-open:rotate-45 motion-reduce:transition-none"
              />
            </summary>
            <p className="max-w-3xl pr-5 pb-6 pl-[4.25rem] leading-relaxed text-muted-foreground sm:pr-8 sm:pl-[5.25rem]">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
