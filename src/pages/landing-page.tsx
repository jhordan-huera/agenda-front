import { PageTitle } from "@/components/shared/page-title";
import { CtaSection } from "@/features/landing/cta-section";
import { FeaturesSection } from "@/features/landing/features-section";
import { HeroSection } from "@/features/landing/hero-section";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import { LandingFooter } from "@/features/landing/landing-footer";
import { LandingNavbar } from "@/features/landing/landing-navbar";
import { PricingSection } from "@/features/landing/pricing-section";

export default function LandingPage() {
  return (
    <>
      <PageTitle />
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </>
  );
}
