import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER } from "./section-heading";
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
 * Preguntas frecuentes (spec 030), con `<details>` nativo: se abren con el teclado y el lector de
 * pantalla sin nada más. Sin precios (constitución): «¿Cuánto cuesta?» lleva a soporte.
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
          Según la Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP). Lo explicamos en la{" "}
          <Link to="/privacidad" className={TEXT_LINK}>
            política de privacidad
          </Link>
          .
        </>
      ),
    },
  ];

  return (
    <section id={LANDING_SECTIONS.faq} aria-labelledby="preguntas-titulo" className="bg-wall py-16 sm:py-24">
      <div className={cn(CONTAINER, "grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10")}>
        <div className="lg:col-span-4">
          <h2 id="preguntas-titulo" className="text-headline font-bold text-foreground">
            Preguntas frecuentes
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            ¿Te queda otra duda?{" "}
            {pricing ? (
              <ContactLink contact={pricing}>Escríbenos</ContactLink>
            ) : (
              "Escríbenos"
            )}
            .
          </p>
        </div>
        <div className="border-t border-rule-strong lg:col-span-8">
          {questions.map(({ question, answer }) => (
            <details key={question} className="group border-b border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 rounded-md py-4 text-left text-[1.0625rem] font-semibold outline-none transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                {question}
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out-soft group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <p className="max-w-2xl pb-5 leading-relaxed text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
