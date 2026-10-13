import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

/** Cierre: una tarjeta en el degradado de la marca (del azul al lila), con una cuadrícula sutil. */
export function CtaSection() {
  return (
    <section className="bg-canvas py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-ink to-lilac-ink px-6 py-14 text-center text-white sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.08)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl leading-tight font-extrabold tracking-[-0.02em] sm:text-4xl">Abre tu agenda y deja que te reserven.</h2>
            <p className="mt-4 text-lg text-white/85">
              Creas tu cuenta, escribes tus servicios y horarios, y compartes el enlace. Así de simple.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-white px-6 text-base text-ink hover:bg-white/90">
                <Link to="/register">
                  Crear mi agenda gratis <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/60 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/login">Iniciar sesión</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/75">Gratis para empezar, sin tarjeta de crédito.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
