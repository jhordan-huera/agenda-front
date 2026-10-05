import { Link } from "react-router";
import { Button } from "@/components/ui/button";

/** Cierre: vuelve al salvia de la portada. */
export function CtaSection() {
  return (
    <section className="bg-accent">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-3xl leading-tight font-extrabold tracking-[-0.02em] sm:text-4xl">
            Abre tu agenda y deja que te reserven.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Creas tu cuenta, escribes tus servicios y horarios, y compartes el enlace. Así de simple.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link to="/register">Crear mi agenda gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 bg-background px-6 text-base">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
