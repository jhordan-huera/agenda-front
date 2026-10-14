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
 * Cabecera de la ficha de un negocio (spec 007): el degradado de la marca del panel, sus datos de un
 * vistazo y las acciones principales.
 */
export function BusinessHero({ business, plan, categoryName, onManage, onToggleStatus }: BusinessHeroProps) {
  const suspended = business.status === "suspended";
  return (
    <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-ink to-lilac-ink p-5 text-white sm:p-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)]"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <BusinessMark
            name={business.name}
            logoUrl={business.logoUrl}
            className="size-14 rounded-2xl bg-white/15 text-lg text-white ring-1 ring-white/25"
          />
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-extrabold tracking-[-0.02em] break-words sm:text-3xl">{business.name}</h1>
            <p className="mt-0.5 text-sm text-white/85">
              {categoryName} · Alta {formatNumericDate(toZonedDate(business.createdAt))}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <PlanBadge plan={plan} className="ring-white/40" />
              <BusinessStatusBadge status={business.status} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="bg-white text-ink hover:bg-white/90" onClick={onManage}>
            <LifeBuoy /> Gestionar negocio
          </Button>
          {!suspended && (
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink /> Página pública
              </a>
            </Button>
          )}
          <Button
            size="lg"
            variant={suspended ? "outline" : "destructive"}
            className={suspended ? "border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white" : "bg-white text-destructive hover:bg-white/90"}
            onClick={onToggleStatus}
          >
            {suspended ? <PlayCircle /> : <PauseCircle />} {suspended ? "Reactivar negocio" : "Suspender negocio"}
          </Button>
        </div>
      </div>
    </section>
  );
}
