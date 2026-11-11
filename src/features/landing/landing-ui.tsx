import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SECTION_TITLE } from "./landing-styles";

/*
 * Las piezas de la portada «Panel de marca» (spec 043): el título de cada sección con su párrafo y la raya tomate
 * corta que encabeza cada función. Sin etiquetas en mayúsculas ni palabras sueltas en cursiva.
 */

/** El título de una sección y, si lo hay, su párrafo. */
export function SectionHeading({ id, title, children, className }: { id: string; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 id={id} className={SECTION_TITLE}>
        {title}
      </h2>
      {children && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}

/** La raya tomate corta que va sobre el título de cada función. */
export function FeatureMark() {
  return <span aria-hidden className="block h-1 w-7 rounded-full bg-ink" />;
}
