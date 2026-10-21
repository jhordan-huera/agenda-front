import { PageTitle } from "@/components/shared/page-title";
import { AudienceSection } from "@/features/landing/audience-section";
import { CtaSection } from "@/features/landing/cta-section";
import { FaqSection } from "@/features/landing/faq-section";
import { HeroSection } from "@/features/landing/hero-section";
import { HighlightsSection } from "@/features/landing/highlights-section";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import { LandingFooter } from "@/features/landing/landing-footer";
import { LandingNavbar } from "@/features/landing/landing-navbar";
import { useSignupContact } from "@/features/landing/use-signup-contact";

/**
 * La portada (spec 030): la barra, la portada con «Tu día», para quién, cómo funciona, lo que distingue a
 * Agenda360, las preguntas, el cierre y el pie. `data-landing` le da a la página el margen de la barra fija
 * para las anclas y el foco (src/index.css).
 */
export default function LandingPage() {
  // Con el registro cerrado, cada «Crear cuenta» pasa a «Quiero mi agenda» (spec 022).
  const signup = useSignupContact();
  return (
    <div data-landing className="bg-wall text-foreground">
      <PageTitle />
      <LandingNavbar signup={signup} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <HeroSection signup={signup} />
        <AudienceSection />
        <HowItWorksSection />
        <HighlightsSection />
        <FaqSection />
        <CtaSection signup={signup} />
      </main>
      <LandingFooter signup={signup} />
    </div>
  );
}
