import { ExternalLink, LifeBuoy, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumericDate, toZonedDate } from "@/lib/format";
import type { Business, PlanId } from "@/types";
import { BusinessStatusBadge, PlanBadge } from "./business-badges";
import { BusinessMark } from "./business-mark";

interface BusinessHeroProps {
  business: Business;
  plan: PlanId;
  categoryName: string;
  onManage: () => void;
  onToggleStatus: () => void;
}

/**
 * Los botones sobre el degradado, con el color del texto del degradado (blanco en el claro). Llevan
 * también su `dark:` porque las variantes `outline` y `destructive` traen fondos propios del oscuro.
 */
const HERO_OUTLINE =
  "border-hero-foreground/40 bg-hero-foreground/10 text-hero-foreground hover:bg-hero-foreground/20 hover:text-hero-foreground dark:border-hero-foreground/40 dark:bg-hero-foreground/10 dark:hover:bg-hero-foreground/20";
/** En el oscuro, el rojo de borrar es claro (para fondos oscuros): sobre la placa clara va el rojo 700. */
const HERO_DESTRUCTIVE =
  "bg-hero-foreground text-destructive hover:bg-hero-foreground/90 dark:bg-hero-foreground dark:text-red-700 dark:hover:bg-hero-foreground/90";

/**
 * Cabecera de la ficha de un negocio (spec 007): el degradado de la marca del panel, sus datos de un
 * vistazo y las acciones principales.
 */
export function BusinessHero({ business, plan, categoryName, onManage, onToggleStatus }: BusinessHeroProps) {
  const suspended = business.status === "suspended";
  return (
    <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-hero to-hero-end p-5 text-hero-foreground sm:p-6">
      {/* La cuadrícula es un velo blanco al 7 % sobre el degradado, en los dos modos; el `black` de la máscara sólo dice dónde se ve. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)]"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <BusinessMark
            name={business.name}
            logoUrl={business.logoUrl}
            className="size-14 rounded-2xl bg-hero-foreground/15 text-lg text-hero-foreground ring-1 ring-hero-foreground/25"
          />
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-extrabold tracking-[-0.02em] break-words sm:text-3xl">{business.name}</h1>
            <p className="mt-0.5 text-sm text-hero-foreground/85">
              {categoryName} · Alta {formatNumericDate(toZonedDate(business.createdAt))}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <PlanBadge plan={plan} className="ring-hero-foreground/40" />
              <BusinessStatusBadge status={business.status} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="bg-hero-foreground text-hero hover:bg-hero-foreground/90" onClick={onManage}>
            <LifeBuoy /> Gestionar negocio
          </Button>
          {!suspended && (
            <Button asChild size="lg" variant="outline" className={HERO_OUTLINE}>
              <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink /> Página pública
              </a>
            </Button>
          )}
          <Button
            size="lg"
            variant={suspended ? "outline" : "destructive"}
            className={suspended ? HERO_OUTLINE : HERO_DESTRUCTIVE}
            onClick={onToggleStatus}
          >
            {suspended ? <PlayCircle /> : <PauseCircle />} {suspended ? "Reactivar negocio" : "Suspender negocio"}
          </Button>
        </div>
      </div>
    </section>
  );
}
