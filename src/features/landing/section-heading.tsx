import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** El ancho de la portada y sus márgenes: el mismo en todas las secciones. */
export const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

/** El espacio vertical de cada sección de la portada (spec 032): el mismo en todas. */
export const SECTION_SPACING = "py-16 sm:py-24";

interface SectionHeadingProps {
  id: string;
  title: string;
  description?: ReactNode;
  /** «center» en las secciones a todo el ancho (las funciones, Funciona con); a la izquierda, las de dos columnas. */
  align?: "start" | "center";
  className?: string;
}

/**
 * El título de una sección de la portada (spec 030): en tinta sólida y con el peso haciendo la jerarquía;
 * la descripción, en el gris de la marca y con un ancho de lectura cómodo. `id` es el del título: la
 * sección lo usa en `aria-labelledby`.
 */
export function SectionHeading({ id, title, description, align = "start", className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <h2 id={id} className="text-headline font-bold text-foreground">
        {title}
      </h2>
      {description && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
