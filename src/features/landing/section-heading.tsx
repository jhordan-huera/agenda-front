import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Texto en el degradado de la marca (del azul al lila), para la palabra que se quiere destacar. */
export function GradientText({ children }: { children: ReactNode }) {
  return <span className="bg-linear-to-r from-ink to-lilac-ink bg-clip-text text-transparent">{children}</span>;
}

/** Etiqueta en forma de píldora sobre un título (como «Funciones»). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-ink", className)}>
      {children}
    </p>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  /** El final del título, en degradado. */
  highlight?: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeading({ eyebrow, title, highlight, description, align = "center" }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <h2 className="text-3xl leading-tight font-extrabold tracking-[-0.02em] sm:text-4xl">
        {title}
        {highlight && (
          <>
            {" "}
            <GradientText>{highlight}</GradientText>
          </>
        )}
      </h2>
      {description && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
