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
          eyebrow="Precios"
          title="Planes simples, sin sorpresas"
          description="Empieza gratis y cambia de plan cuando tu negocio lo necesite."
        />
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-background p-6",
                plan.highlighted && "border-primary shadow-xl shadow-primary/10 ring-1 ring-primary",
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Más popular
                </span>
              )}
              <h3 className="text-sm font-semibold tracking-wide uppercase">{plan.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{formatCurrency(plan.price)}</span>
                <span className="text-sm text-muted-foreground">/mes</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                variant={plan.highlighted ? "default" : "outline"}
                className="mt-8 h-10 w-full"
              >
                <Link to="/register">{plan.price === 0 ? "Comenzar gratis" : `Elegir ${plan.name}`}</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Precios en USD. Durante la beta todas las funciones están disponibles sin coste.
        </p>
      </div>
    </section>
  );
}
