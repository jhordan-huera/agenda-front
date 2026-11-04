import { cn } from "@/lib/utils";
import { LANDING_SECTIONS, TESTIMONIAL } from "./landing-constants";
import { CONTAINER, SECTION_SPACING } from "./section-heading";

/**
 * El testimonio de una clienta (spec 032), sólo con su permiso: lee `TESTIMONIAL` (landing-constants.ts) y,
 * mientras sea `null`, no dibuja nada (tampoco sale su enlace en el pie). Una sola cita, grande y centrada
 * en una hoja blanca, con su nombre, su especialidad y, si la dio, su ciudad. Sin foto ni estrellas.
 */
export function TestimonialSection() {
  if (!TESTIMONIAL) return null;
  const { quote, name, role, city } = TESTIMONIAL;
  return (
    <section id={LANDING_SECTIONS.testimonial} aria-labelledby="testimonio-titulo" className={cn(SECTION_SPACING, "pt-0 sm:pt-0")}>
      <div className={CONTAINER}>
        <h2 id="testimonio-titulo" className="sr-only">
          Lo que dicen quienes ya la usan
        </h2>
        <figure className="mx-auto max-w-3xl rounded-2xl bg-card px-6 py-10 text-center shadow-sheet sm:px-12 sm:py-14">
          <blockquote>
            <p className="text-xl leading-relaxed font-medium tracking-[-0.01em] text-foreground sm:text-2xl">«{quote}»</p>
          </blockquote>
          <figcaption className="mt-6 text-sm">
            <span className="block font-semibold">{name}</span>
            <span className="block text-muted-foreground">{[role, city].filter(Boolean).join(", ")}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
