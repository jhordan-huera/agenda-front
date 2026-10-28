import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/geist-mono/wght.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@/features/landing/landing.css";
import { PageTitle } from "@/components/shared/page-title";
import { DataSection } from "@/features/landing/data-section";
import { FaqSection } from "@/features/landing/faq-section";
import { FeatureMarquee } from "@/features/landing/feature-marquee";
import { FeaturesSection } from "@/features/landing/features-section";
import { TRACKED_SECTIONS } from "@/features/landing/landing-constants";
import { LandingFooter } from "@/features/landing/landing-footer";
import { useActiveSection } from "@/features/landing/landing-motion";
import { LandingNav } from "@/features/landing/landing-nav";
import { FRAME } from "@/features/landing/landing-styles";
import { OrbitHero } from "@/features/landing/orbit-hero";
import { ScrollRail } from "@/features/landing/scroll-rail";
import { StartSection } from "@/features/landing/start-section";
import { useSignupContact } from "@/features/landing/use-signup-contact";

const SECTION_IDS = TRACKED_SECTIONS.map((section) => section.id);

/**
 * La portada editorial (prueba en dev, 2026-10-27), al estilo de getartcraft.com, leído con REA:
 * - la barra de arriba con las secciones en mayúsculas monoespaciadas;
 * - el nombre enorme, con la órbita de trozos de Agenda360 detrás;
 * - la cinta de funciones;
 * - dentro del marco con líneas de plano, 01 / Funciones, 02 / Tus datos, 03 / Preguntas y el cierre;
 * - el pie en casillas y, en pantallas anchas, la regla de la derecha.
 * Con los colores de la marca (el tomate y los grises) y sin datos inventados. `data-landing` le da a la
 * página el margen de la barra para las anclas (src/index.css).
 */
export default function LandingPage() {
  // Con el registro cerrado, cada «Crear cuenta» pasa a «Quiero mi agenda» (spec 022).
  const signup = useSignupContact();
  const active = useActiveSection(SECTION_IDS);
  return (
    <div data-landing className="min-h-screen bg-wall text-foreground">
      <PageTitle />
      <LandingNav signup={signup} active={active} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <OrbitHero signup={signup} />
        <FeatureMarquee />
        <div className={FRAME}>
          <FeaturesSection />
          <DataSection />
          <FaqSection />
          <StartSection signup={signup} />
        </div>
      </main>
      <LandingFooter signup={signup} />
      <ScrollRail active={active} />
    </div>
  );
}
