import "@fontsource-variable/schibsted-grotesk/wght.css";
import "@/features/landing/landing.css";
import { Link } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { BrandPanel } from "@/features/landing/brand-panel";
import { DataSection } from "@/features/landing/data-section";
import { FaqSection } from "@/features/landing/faq-section";
import { FeaturesSection } from "@/features/landing/features-section";
import { DEMO_BOOKING_PATH, LANDING_HERO, TRACKED_SECTIONS } from "@/features/landing/landing-constants";
import { LandingFooter } from "@/features/landing/landing-footer";
import { useActiveSection } from "@/features/landing/landing-motion";
import { LandingNav } from "@/features/landing/landing-nav";
import { PANEL_BUTTON, PANEL_OUTLINE_BUTTON } from "@/features/landing/landing-styles";
import { SignupLink } from "@/features/landing/signup-link";
import { SpecialtiesRow } from "@/features/landing/specialties-row";
import { StartSection } from "@/features/landing/start-section";
import { useSignupContact } from "@/features/landing/use-signup-contact";
import { WeekPreview } from "@/features/landing/week-preview";

const SECTION_IDS = TRACKED_SECTIONS.map((section) => section.id);

/**
 * La portada «Panel de marca» (spec 043, aprobada el 2026-11-11): la barra; el panel tomate con la agenda de la
 * semana de ejemplo; «Hecho para»; las funciones; «Tus datos»; las preguntas; el cierre y el pie. Una sola familia
 * de letra y la gama de la marca. `data-landing` le da a la página el margen de la barra para las anclas
 * (src/index.css).
 */
export default function LandingPage() {
  // Con el registro cerrado, cada «Crear cuenta» pasa a «Quiero mi agenda» (spec 022).
  const signup = useSignupContact();
  const active = useActiveSection(SECTION_IDS);
  return (
    <div data-landing className="font-display min-h-screen bg-wall text-foreground">
      <PageTitle />
      <LandingNav signup={signup} active={active} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <BrandPanel
          titleId="titulo-portada"
          title={LANDING_HERO.title}
          text={LANDING_HERO.text}
          actions={
            <>
              <SignupLink contact={signup} registerLabel="Crear mi agenda gratis" className={PANEL_BUTTON} />
              <Link to={DEMO_BOOKING_PATH} className={PANEL_OUTLINE_BUTTON}>
                Ver una página de reservas
              </Link>
            </>
          }
          note={LANDING_HERO.note}
          aside={<WeekPreview />}
        />
        <SpecialtiesRow />
        <FeaturesSection />
        <DataSection />
        <FaqSection />
        <StartSection signup={signup} />
      </main>
      <LandingFooter signup={signup} />
    </div>
  );
}
