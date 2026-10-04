import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { APP_TAGLINE } from "@/lib/constants/app";
import { ProductPreview } from "./product-preview";

const TRUST_POINTS = ["Sin tarjeta de crédito", "Listo en 5 minutos", "Página de reservas incluida"];

const PROFESSIONS = [
  "Psicólogos",
  "Odontólogos",
  "Nutricionistas",
  "Fisioterapeutas",
  "Fonoaudiólogos",
  "Entrenadores",
  "Profesores",
  "Salones de belleza",
  "Abogados",
  "Fotógrafos",
  "Técnicos",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_70%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]"
      />
      <div className="mx-auto grid max-w-6xl gap-14 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:pt-24 lg:pb-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="size-1.5 rounded-full bg-primary" />
            Beta abierta · Gratis para empezar
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {APP_TAGLINE}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Gestiona tus citas, clientes y horarios desde un solo lugar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5 text-sm">
              <Link to="/register">
                Comenzar gratis <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-5 text-sm">
              <a href="#como-funciona">Ver cómo funciona</a>
            </Button>
          </div>
          <ul className="mt-8 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <ProductPreview />
      </div>

      <div className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-center text-sm text-muted-foreground">
            Pensado para profesionales independientes y pequeños negocios
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {PROFESSIONS.map((profession) => (
              <li
                key={profession}
                className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground/80"
              >
                {profession}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
