import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BRAND_PANEL, CONTAINER, DISPLAY } from "./landing-styles";

interface BrandPanelProps {
  /** El id del título (para `aria-labelledby`). */
  titleId: string;
  title: ReactNode;
  text: ReactNode;
  /** Los botones. */
  actions: ReactNode;
  /** La línea de abajo («Gratis para empezar…» o «También para…»). */
  note?: ReactNode;
  /** Lo de la derecha: la agenda de la semana en la portada, la ilustración de la especialidad en su página. */
  aside: ReactNode;
}

/**
 * El panel de marca (spec 043), arriba de la portada y de cada página por especialidad: el bloque tomate con el
 * título en claro, su texto, los botones y, a la derecha (debajo en el celular), lo que lo muestra. Dentro del
 * ancho de la página: nada se sale por el borde.
 */
export function BrandPanel({ titleId, title, text, actions, note, aside }: BrandPanelProps) {
  return (
    <section aria-labelledby={titleId} className={cn(CONTAINER, "pt-2")}>
      <div className={cn(BRAND_PANEL, "grid items-center gap-9 px-5 pt-10 pb-5 sm:px-10 sm:py-14 lg:grid-cols-2 lg:gap-14 lg:px-16 lg:py-[4.5rem]")}>
        <div>
          <h1 id={titleId} className={cn(DISPLAY, "max-w-[15ch] text-[clamp(2.5rem,5.2vw,3.75rem)] leading-[1.02]")}>
            {title}
          </h1>
          <p className="mt-5 max-w-[40ch] text-[1.0625rem] leading-relaxed text-hero-foreground/90 sm:text-lg">{text}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div>
          {note && <p className="mt-6 text-sm text-hero-foreground/85">{note}</p>}
        </div>
        <div className="min-w-0">{aside}</div>
      </div>
    </section>
  );
}
