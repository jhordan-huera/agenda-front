import { Check } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/constants/plans";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

export function PricingSection() {
  return (
    <section id="precios" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title="Precios"
          description="Empieza gratis. Cambia de plan cuando tu agenda se llene o sumes a alguien a tu equipo."
        />
        {/* Una sola tabla de planes: las columnas se comparan de un vistazo. */}
        <div className="mt-12 grid overflow-hidden rounded-2xl border lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col p-6 sm:p-8",
                index > 0 && "border-t lg:border-t-0 lg:border-l",
                // El plan recomendado, sobre el salvia de la marca.
                plan.highlighted && "bg-accent",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                {plan.highlighted && (
                  <span className="rounded-full bg-highlight px-2.5 py-0.5 text-sm font-semibold text-ink">Recomendado</span>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-5xl font-extrabold tracking-[-0.02em] tabular-nums">{formatCurrency(plan.price)}</span>
                <span className="text-muted-foreground">al mes</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <Check className="mt-1 size-4 shrink-0 text-ink" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                variant={plan.highlighted ? "default" : "outline"}
                className="mt-8 h-11 w-full text-base"
              >
                <Link to="/register">{plan.price === 0 ? "Crear mi agenda gratis" : `Empezar con ${plan.name}`}</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Precios en dólares. Durante la beta todas las funciones están disponibles sin costo.
        </p>
      </div>
    </section>
  );
}
