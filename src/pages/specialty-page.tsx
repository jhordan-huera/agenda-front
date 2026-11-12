import "@fontsource-variable/schibsted-grotesk/wght.css";
import "@/features/landing/landing.css";
import { Plus } from "lucide-react";
import { Link, useLocation } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { BrandPanel } from "@/features/landing/brand-panel";
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
import { FeatureItem } from "@/features/landing/features-section";
import { LandingFooter } from "@/features/landing/landing-footer";
import { useActiveSection } from "@/features/landing/landing-motion";
import { LandingNav } from "@/features/landing/landing-nav";
import { CONTAINER, PANEL_BUTTON, PANEL_OUTLINE_BUTTON } from "@/features/landing/landing-styles";
import { SectionHeading } from "@/features/landing/landing-ui";
import { SignupLink } from "@/features/landing/signup-link";
import { SPECIALTIES, specialtyBySlug, type AccentTitle, type SpecialtyVisual } from "@/features/landing/specialties";
import { StartSection } from "@/features/landing/start-section";
import { useSignupContact } from "@/features/landing/use-signup-contact";
import { WeekPreview } from "@/features/landing/week-preview";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { cn } from "@/lib/utils";
import { getSupportWhatsAppUrl } from "@/lib/whatsapp";
import NotFoundPage from "@/pages/not-found-page";

/** Las secciones de la página, para la barra de arriba (el cierre lleva el id de la portada). */
const SECTIONS = [
  { id: "dia-a-dia", label: "Tu día a día" },
  { id: "como-empezar", label: "Cómo empezar" },
  { id: "preguntas", label: "Preguntas" },
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

/** El título entero, con la misma letra (spec 043: sin palabras sueltas en cursiva), sin espacio antes de un punto. */
const titleText = (title: AccentTitle) => `${title.before} ${title.accent}${/^[.,]/.test(title.after) ? title.after : ` ${title.after}`}`;

/** «Fisioterapeutas y odontólogos»: las otras dos, en una frase. */
function OtherSpecialties({ slug }: { slug: string }) {
  const others = SPECIALTIES.filter((other) => other.slug !== slug);
  return (
    <>
      También para{" "}
      {others.map((other, index) => (
        <span key={other.slug}>
          {index > 0 && (index === others.length - 1 ? " y " : ", ")}
          <Link
            to={`/${other.slug}`}
            className="rounded-sm font-semibold text-hero-foreground underline decoration-hero-foreground/50 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-3 focus-visible:ring-hero-foreground/70"
          >
            {other.name.toLowerCase()}
          </Link>
        </span>
      ))}
      .
    </>
  );
}

/**
 * Una página por especialidad (spec 041): /psicologos, /fisioterapeutas y /odontologos, con las piezas de la portada
 * «Panel de marca» (spec 043) y los textos de specialties.ts: el panel tomate con la agenda de la semana con sus
 * servicios, «Tu día a día», «Cómo empezar», «Preguntas», el cierre y el pie. «Escríbenos por WhatsApp» lleva al
 * WhatsApp de soporte con el mensaje de la especialidad; sin WhatsApp de soporte, no sale.
 */
export default function SpecialtyPage() {
  const { pathname } = useLocation();
  const specialty = specialtyBySlug(pathname.split("/")[1]?.toLowerCase() ?? "");
  const signup = useSignupContact();
  const settings = usePlatformSettings();
  const active = useActiveSection(SECTION_IDS);
  if (!specialty) return <NotFoundPage />;
  const whatsAppUrl = settings.data?.supportPhone ? getSupportWhatsAppUrl(settings.data.supportPhone, specialty.whatsappMessage) : null;

  return (
    <div data-landing className="font-display min-h-screen bg-wall text-foreground">
      <PageTitle title={specialty.meta.title} />
      <LandingNav signup={signup} active={active} sections={SECTIONS} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <BrandPanel
          titleId="titulo-especialidad"
          title={titleText(specialty.hero)}
          text={specialty.hero.text}
          actions={
            <>
              <SignupLink contact={signup} registerLabel="Crear mi agenda gratis" className={PANEL_BUTTON} />
              {whatsAppUrl && (
                <a href={whatsAppUrl} target="_blank" rel="noreferrer" className={PANEL_OUTLINE_BUTTON}>
                  Escríbenos por WhatsApp
                </a>
              )}
            </>
          }
          note={<OtherSpecialties slug={specialty.slug} />}
          aside={<WeekPreview services={specialty.week} />}
        />

        <section aria-labelledby="titulo-dia" id="dia-a-dia" className={cn(CONTAINER, "pt-20 sm:pt-28")}>
          <SectionHeading id="titulo-dia" title={titleText(specialty.intro)} className="px-1">
            {specialty.intro.text}
          </SectionHeading>
          <div className="mt-12 grid gap-x-10 gap-y-14 md:grid-cols-2 lg:gap-x-14 lg:gap-y-20">
            {specialty.blocks.map((block) => (
              <FeatureItem key={block.label} title={block.title} description={block.description} visual={<Visual visual={block.visual} />} />
            ))}
          </div>
          <p className="mt-10 px-1 text-sm text-muted-foreground">Las ilustraciones usan datos de ejemplo.</p>
        </section>

        <section aria-labelledby="titulo-pasos" id="como-empezar" className={cn(CONTAINER, "pt-24 sm:pt-32")}>
          <SectionHeading id="titulo-pasos" title="Cómo empezar" className="px-1" />
          <ol className="mt-10 grid gap-10 px-1 md:grid-cols-3 md:gap-8">
            {specialty.steps.map((step, index) => (
              <li key={step.title}>
                <span className="font-display flex size-9 items-center justify-center rounded-full bg-foreground text-[0.9375rem] font-bold text-background">
                  {index + 1}
                </span>
                <h3 className="font-display mt-5 text-xl leading-tight font-bold tracking-[-0.02em]">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="titulo-preguntas" id="preguntas" className={cn(CONTAINER, "pt-24 sm:pt-32")}>
          <div className="grid gap-10 px-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] lg:gap-16">
            <SectionHeading id="titulo-preguntas" title={`Preguntas de ${specialty.name.toLowerCase()}`} />
            <div className="border-t border-border">
              {specialty.questions.map((item, index) => (
                <details key={item.question} className="group border-b border-border" open={index === 0}>
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-5 rounded-lg py-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                    <span className="font-display flex-1 text-[1.0625rem] font-bold">{item.question}</span>
                    <Plus
                      aria-hidden
                      className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out-soft group-open:rotate-45 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="max-w-3xl pr-10 pb-6 leading-relaxed text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <StartSection signup={signup} />
      </main>
      <LandingFooter signup={signup} />
    </div>
  );
}
