import { PageTitle } from "@/components/shared/page-title";
import { AppointmentFlowSection } from "@/features/landing/appointment-flow-section";
import { AutomationSection } from "@/features/landing/automation-section";
import { CtaSection } from "@/features/landing/cta-section";
import { FactsBand } from "@/features/landing/facts-band";
import { FaqSection } from "@/features/landing/faq-section";
import { HeroSection } from "@/features/landing/hero-section";
import { HighlightsSection } from "@/features/landing/highlights-section";
import { IntegrationsSection } from "@/features/landing/integrations-section";
import { LandingFooter } from "@/features/landing/landing-footer";
import { LandingNavbar } from "@/features/landing/landing-navbar";
import { TestimonialSection } from "@/features/landing/testimonial-section";
import { useSignupContact } from "@/features/landing/use-signup-contact";

/**
 * La portada (spec 032), al estilo de una plataforma de ventas: la barra flotante, el encabezado centrado con
 * la vista del panel, los cuatro hechos, cómo avanza una cita, las seis funciones, lo automático, con qué
 * funciona, el testimonio (sólo si está autorizado), las preguntas, el cierre y el pie. Sobre el lienzo del
 * panel (--canvas), con tarjetas blancas; todo en la gama de la marca, el tomate (spec 033).
 * `data-landing` le da a la página el margen de la barra para las anclas y el foco (src/index.css).
 */
export default function LandingPage() {
  // Con el registro cerrado, cada «Crear cuenta» pasa a «Quiero mi agenda» (spec 022).
  const signup = useSignupContact();
  return (
    <div data-landing className="bg-canvas text-foreground">
      <PageTitle />
      <LandingNavbar signup={signup} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <HeroSection signup={signup} />
        <FactsBand />
        <AppointmentFlowSection />
        <HighlightsSection />
        <AutomationSection />
        <IntegrationsSection />
        <TestimonialSection />
        <FaqSection />
        <CtaSection signup={signup} />
      </main>
      <LandingFooter signup={signup} />
    </div>
  );
}
