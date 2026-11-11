import { cn } from "@/lib/utils";

/*
 * Los estilos de la portada «Panel de marca» (spec 043) y de las páginas por especialidad: el contenedor, el panel
 * tomate, los títulos y los botones. Una sola familia (Schibsted Grotesk, --font-display) y los tokens de la marca:
 * el tomate (--hero, --ink), el durazno (--highlight) y los grises, en claro y en oscuro.
 */

/** El ancho de la página: hasta 1280 px, centrado, con margen a los lados. */
export const CONTAINER = "mx-auto w-full max-w-[1280px] px-3 sm:px-6";

/** El panel de marca: el bloque tomate con las esquinas redondeadas, dentro del ancho de la página. */
export const BRAND_PANEL = "rounded-[1.625rem] bg-hero text-hero-foreground sm:rounded-[2rem]";

/** Los títulos: la letra de la portada, muy negra y apretada. */
export const DISPLAY = "font-display font-extrabold tracking-[-0.04em]";

/** El título de cada sección. */
export const SECTION_TITLE = cn(DISPLAY, "text-[clamp(2rem,4vw,2.75rem)] leading-[1.06] tracking-[-0.035em]");

const BUTTON =
  "font-display inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-center text-base font-bold outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-offset-2 motion-reduce:transition-none";

/** El botón principal sobre el panel tomate: claro, con la letra de la marca. */
export const PANEL_BUTTON = cn(
  BUTTON,
  "bg-hero-foreground text-hero hover:bg-hero-foreground/90 focus-visible:ring-hero-foreground/70 focus-visible:ring-offset-hero",
);

/** El secundario sobre el panel: sólo el borde claro. */
export const PANEL_OUTLINE_BUTTON = cn(
  BUTTON,
  "text-hero-foreground ring-1 ring-hero-foreground/55 ring-inset hover:bg-hero-foreground/10 focus-visible:ring-hero-foreground/70 focus-visible:ring-offset-hero",
);

/** El botón oscuro de la barra: el color del texto sobre el fondo. */
export const INK_BUTTON = cn(
  BUTTON,
  "min-h-11 bg-foreground px-4 text-[0.9375rem] whitespace-nowrap text-background hover:bg-foreground/85 focus-visible:ring-ring/60 focus-visible:ring-offset-wall sm:px-5",
);
