import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

/**
 * Cierre: una tarjeta en el degradado de la marca (del azul al lila), con una cuadrícula sutil. Las
 * líneas de la cuadrícula van en blanco translúcido a propósito: sólo aclaran el degradado.
 */
export function CtaSection() {
  return (
    <section className="bg-canvas py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-hero to-hero-end px-6 py-14 text-center text-hero-foreground sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.08)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl leading-tight font-extrabold tracking-[-0.02em] sm:text-4xl">Abre tu agenda y deja que te reserven.</h2>
            <p className="mt-4 text-lg text-hero-foreground/85">
              Creas tu cuenta, escribes tus servicios y horarios, y compartes el enlace. Así de simple.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-hero-foreground px-6 text-base text-hero hover:bg-hero-foreground/90">
                <Link to="/register">
                  Crear mi agenda gratis <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-hero-foreground/60 bg-transparent px-6 text-base text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground dark:border-hero-foreground/60 dark:bg-transparent dark:hover:bg-hero-foreground/10"
              >
                <Link to="/login">Iniciar sesión</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-hero-foreground/75">Gratis para empezar, sin tarjeta de crédito.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
