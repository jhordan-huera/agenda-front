import type { ReactNode } from "react";
import { Eyebrow, GradientText } from "@/features/landing/section-heading";

interface AuthCardHeaderProps {
  title: string;
  description: ReactNode;
  /** Etiqueta en píldora encima del título, como en la portada. */
  eyebrow?: ReactNode;
  /** El final del título, en el degradado de la marca. */
  highlight?: string;
}

export function AuthCardHeader({ title, description, eyebrow, highlight }: AuthCardHeaderProps) {
  return (
    <div className="mb-7">
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <h1 className="text-3xl leading-tight font-extrabold tracking-[-0.025em] sm:text-[2.15rem]">
        {title}
        {highlight && (
          <>
            {" "}
            <GradientText>{highlight}</GradientText>
          </>
        )}
      </h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
    </div>
  );
}
