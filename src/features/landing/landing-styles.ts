import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
 * Los estilos de la portada editorial (prueba en dev, 2026-10-27), al estilo de getartcraft.com: el marco con
 * las líneas de plano a los lados, las etiquetas técnicas, los títulos anchos y los botones rectos. Todo con
 * los tokens de la marca: el tomate y los grises, en claro y oscuro.
 */

/** El marco del contenido: 1280 px con una línea a cada lado, de arriba abajo. */
export const FRAME = "relative mx-4 border-x border-border sm:mx-6 xl:mx-auto xl:max-w-[1280px]";

/** Las etiquetas técnicas: monoespaciadas, en mayúsculas y espaciadas. */
export const TECH_LABEL = "font-tech text-[0.6875rem] font-medium tracking-[0.18em] uppercase";

/** Los títulos: Archivo ensanchada, muy apretada. */
export const WIDE_HEADING = "font-wide font-extrabold tracking-[-0.035em] [font-stretch:118%]";

const BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 px-6 text-center outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-wall";

/** El botón principal: el bloque del color del texto; al pasar, la marca. */
export const PRIMARY_BUTTON = cn(BUTTON, TECH_LABEL, "bg-foreground text-background hover:bg-ink hover:text-primary-foreground");

/** El secundario: sólo el borde. */
export const SECONDARY_BUTTON = cn(BUTTON, TECH_LABEL, "border border-foreground/35 text-foreground hover:border-foreground hover:bg-foreground/5");

/** El retraso de una pieza que aparece (data-reveal), para escalonarlas. */
export const revealDelay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

/** El retraso de una pieza de la entrada al cargar (landing-rise). */
export const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;
