import { PageTitle } from "@/components/shared/page-title";
import { CtaSection } from "@/features/landing/cta-section";
import { FeaturesSection } from "@/features/landing/features-section";
import { HeroSection } from "@/features/landing/hero-section";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import { LandingFooter } from "@/features/landing/landing-footer";
import { LandingNavbar } from "@/features/landing/landing-navbar";
import { PanelPreviewSection } from "@/features/landing/panel-preview-section";
import { useSignupContact } from "@/features/landing/use-signup-contact";

export default function LandingPage() {
  // Con el registro cerrado, cada «Crear cuenta» pasa a «Quiero mi agenda» (spec 022).
  const signup = useSignupContact();
  return (
    <>
      <PageTitle />
      <LandingNavbar signup={signup} />
      <main>
        <HeroSection signup={signup} />
        <FeaturesSection />
        <PanelPreviewSection />
        <HowItWorksSection />
        <CtaSection signup={signup} />
      </main>
      <LandingFooter signup={signup} />
    </>
  );
}
