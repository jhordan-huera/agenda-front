import type { ReactNode } from "react";

interface AuthCardHeaderProps {
  title: string;
  description: ReactNode;
}

/**
 * El título de cada paso del acceso (spec 030): en tinta sólida, con el peso haciendo la jerarquía, como los
 * de la portada; debajo, la frase en el gris de la marca.
 */
export function AuthCardHeader({ title, description }: AuthCardHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
