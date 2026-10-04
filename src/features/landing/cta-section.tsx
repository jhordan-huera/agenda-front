import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-foreground px-6 py-14 text-center text-background sm:px-12">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,color-mix(in_oklch,var(--primary)_45%,transparent),transparent)]"
        />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Empieza a organizar tu negocio hoy.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-background/70">
            Crea tu cuenta gratis, configura tus servicios y comparte tu enlace de reservas en minutos.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 bg-background px-5 text-foreground hover:bg-background/90">
              <Link to="/register">
                Comenzar gratis <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-11 px-5 text-background hover:bg-background/10 hover:text-background"
            >
              <Link to="/login">Ver la demo</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
