import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/geist-mono/wght.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@/features/landing/landing.css";
import { ArrowRight, Plus } from "lucide-react";
import { Link, useLocation } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import {
  BookingVisual,
  CalendarVisual,
  ClinicalFilesVisual,
  ClinicalVisual,
  HomeVisitVisual,
  PaymentVisual,
  ReminderVisual,
  TeamVisual,
  WeekVisual,
} from "@/features/landing/feature-visuals";
import { LandingFooter } from "@/features/landing/landing-footer";
import { revealAndPlayRef, revealRef, useActiveSection } from "@/features/landing/landing-motion";
import { LandingNav } from "@/features/landing/landing-nav";
import { FRAME, PRIMARY_BUTTON, revealDelay, SECONDARY_BUTTON, TECH_LABEL, WIDE_HEADING } from "@/features/landing/landing-styles";
import { Accent, SectionBar, SectionIntro } from "@/features/landing/landing-ui";
import { SignupLink } from "@/features/landing/signup-link";
import { SPECIALTIES, specialtyBySlug, type AccentTitle, type SpecialtyVisual } from "@/features/landing/specialties";
import { StartSection } from "@/features/landing/start-section";
import { useSignupContact } from "@/features/landing/use-signup-contact";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { cn } from "@/lib/utils";
import { getSupportWhatsAppUrl } from "@/lib/whatsapp";
import NotFoundPage from "@/pages/not-found-page";

/** Las secciones de la página, para la barra de arriba (el cierre lleva el id de la portada). */
const SECTIONS = [
  { id: "dia-a-dia", label: "Tu día a día" },
  { id: "como-empezar", label: "Cómo empezar" },
  { id: "preguntas", label: "Preguntas" },
  { id: "empezar", label: "Empezar" },
];
const SECTION_IDS = SECTIONS.map((section) => section.id);

function Visual({ visual }: { visual: SpecialtyVisual }) {
  switch (visual.kind) {
    case "booking":
      return <BookingVisual service={visual.service} detail={visual.detail} />;
    case "reminder":
      return <ReminderVisual />;
    case "week":
      return <WeekVisual />;
    case "clinical":
      return <ClinicalVisual />;
    case "files":
      return <ClinicalFilesVisual title={visual.title} file={visual.file} />;
    case "payment":
      return <PaymentVisual />;
    case "calendar":
      return <CalendarVisual />;
    case "team":
      return <TeamVisual />;
    case "homeVisit":
      return <HomeVisitVisual />;
  }
}

/** «Tu consulta, sin *perseguir* a nadie.»: la palabra en cursiva, sin espacio antes de un punto. */
function Title({ title }: { title: AccentTitle }) {
  return (
    <>
      {title.before} <Accent>{title.accent}</Accent>
      {/^[.,]/.test(title.after) ? title.after : ` ${title.after}`}
    </>
  );
}

/**
 * Una página por especialidad (spec 041): /psicologos, /fisioterapeutas y /odontologos, con las piezas de la
 * portada nueva y los textos de specialties.ts. La estructura es la del prototipo que aprobó el dueño del producto
 * (specs/041-paginas-por-especialidad/prototipo): el encabezado con los botones, 01 / Tu día a día, 02 / Cómo
 * empezar, 03 / Preguntas, el cierre y el pie. «Escríbenos por WhatsApp» lleva al WhatsApp de soporte con el
 * mensaje de la especialidad; sin WhatsApp de soporte, no sale.
 */
export default function SpecialtyPage() {
  const { pathname } = useLocation();
  const specialty = specialtyBySlug(pathname.split("/")[1]?.toLowerCase() ?? "");
  const signup = useSignupContact();
  const settings = usePlatformSettings();
  const active = useActiveSection(SECTION_IDS);
  if (!specialty) return <NotFoundPage />;
  const whatsAppUrl = settings.data?.supportPhone ? getSupportWhatsAppUrl(settings.data.supportPhone, specialty.whatsappMessage) : null;
  const others = SPECIALTIES.filter((other) => other.slug !== specialty.slug);

  return (
    <div data-landing className="min-h-screen bg-wall text-foreground">
      <PageTitle title={specialty.meta.title} />
      <LandingNav signup={signup} active={active} sections={SECTIONS} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <div className={FRAME}>
          <section aria-labelledby="titulo-especialidad" className="border-b border-border px-5 pt-28 pb-14 sm:px-10 sm:pt-40 sm:pb-20">
            <p className={cn(TECH_LABEL, "landing-rise text-muted-foreground")}>
              <Link to="/" className="hover:text-foreground">
                Agenda360
              </Link>{" "}
              · <span className="text-ink">Para {specialty.name.toLowerCase()}</span>
            </p>
            <h1 id="titulo-especialidad" className={cn(WIDE_HEADING, "landing-rise mt-6 max-w-5xl text-[clamp(2.75rem,7.5vw,6rem)] leading-[0.95]")}>
              <Title title={specialty.hero} />
            </h1>
            <p className="landing-rise mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{specialty.hero.text}</p>
            <div className="landing-rise mt-10 flex flex-col gap-3 sm:flex-row">
              <SignupLink contact={signup} registerLabel="Crear mi agenda gratis" className={PRIMARY_BUTTON} after={<ArrowRight className="size-4" />} />
              {whatsAppUrl && (
                <a href={whatsAppUrl} target="_blank" rel="noreferrer" className={SECONDARY_BUTTON}>
                  Escríbenos por WhatsApp
                </a>
              )}
            </div>
            <p className={cn(TECH_LABEL, "landing-rise mt-10 text-muted-foreground")}>
              También para:{" "}
              {others.map((other, index) => (
                <span key={other.slug}>
                  {index > 0 && " · "}
                  <Link to={`/${other.slug}`} className="text-foreground underline decoration-ink/40 underline-offset-4 hover:decoration-current">
                    {other.name}
                  </Link>
                </span>
              ))}
            </p>
          </section>

          <section aria-labelledby="titulo-dia" id="dia-a-dia">
            <SectionBar index="01" title="Tu día a día" note="Ilustraciones · datos de ejemplo" />
            <SectionIntro id="titulo-dia" title={<Title title={specialty.intro} />}>
              {specialty.intro.text}
            </SectionIntro>
            <div className="grid md:grid-cols-2">
              {specialty.blocks.map((block, index) => (
                <article
                  key={block.label}
                  ref={revealAndPlayRef}
                  data-reveal
                  style={revealDelay((index % 2) * 120)}
                  className="flex flex-col border-b border-border md:odd:border-r"
                >
                  <header className={cn(TECH_LABEL, "flex h-11 items-center justify-between border-b border-border px-5 text-muted-foreground sm:px-8")}>
                    <span>{block.label}</span>
                    <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  </header>
                  <div aria-hidden className="lv flex h-64 items-center justify-center overflow-hidden bg-canvas px-5 sm:h-72 sm:px-10">
                    <Visual visual={block.visual} />
                  </div>
                  <div className="p-5 sm:p-8">
                    <h3 className={cn(WIDE_HEADING, "text-xl leading-tight font-bold tracking-[-0.02em] [font-stretch:108%] sm:text-2xl")}>{block.title}</h3>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{block.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="titulo-pasos" id="como-empezar">
            <SectionBar index="02" title="Cómo empezar" note="En una tarde" />
            <h2 id="titulo-pasos" className="sr-only">
              Cómo empezar
            </h2>
            <ol className="grid md:grid-cols-3">
              {specialty.steps.map((step, index) => (
                <li key={step.title} ref={revealRef} data-reveal style={revealDelay(index * 100)} className="border-b border-border p-5 sm:p-8 md:not-last:border-r">
                  <p className={cn(TECH_LABEL, "text-ink")}>Paso {index + 1}</p>
                  <h3 className={cn(WIDE_HEADING, "mt-4 text-2xl leading-tight font-bold tracking-[-0.02em]")}>{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="titulo-preguntas" id="preguntas">
            <SectionBar index="03" title="Preguntas" note={`De ${specialty.name.toLowerCase()}`} />
            <h2 id="titulo-preguntas" className="sr-only">
              Preguntas frecuentes de {specialty.name.toLowerCase()}
            </h2>
            <div className="divide-y divide-border border-b border-border">
              {specialty.questions.map((item, index) => (
                <details key={item.question} className="group px-5 sm:px-10" open={index === 0}>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <span className="flex items-baseline gap-5">
                      <span className={cn(TECH_LABEL, "text-muted-foreground tabular-nums")}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={cn(WIDE_HEADING, "text-lg font-bold tracking-[-0.02em] sm:text-xl")}>{item.question}</span>
                    </span>
                    <Plus aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="max-w-3xl pb-6 pl-11 leading-relaxed text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <StartSection signup={signup} />
        </div>
      </main>
      <LandingFooter signup={signup} />
    </div>
  );
}
