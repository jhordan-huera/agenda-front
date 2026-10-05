import { Clock, Home } from "lucide-react";
import { formatCurrency, formatDuration, isPriceVisible } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicService } from "@/types";

interface ServiceStepProps {
  services: PublicService[];
  currency: string;
  selectedId: string | null;
  onSelect: (service: PublicService) => void;
}

export function ServiceStep({ services, currency, selectedId, onSelect }: ServiceStepProps) {
  return (
    <div role="radiogroup" aria-label="Servicios" className="divide-y overflow-hidden rounded-xl border">
      {services.map((service) => {
        const selected = service.id === selectedId;
        const showPrice = isPriceVisible(service);
        return (
          <button
            key={service.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(service)}
            className={cn(
              "flex w-full items-start justify-between gap-4 bg-background px-4 py-4 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:px-5",
              selected && "bg-accent hover:bg-accent",
            )}
          >
            <span className="min-w-0 space-y-1">
              <span className="block text-lg font-bold">{service.name}</span>
              {service.description && (
                <span className="line-clamp-2 block text-muted-foreground">{service.description}</span>
              )}
              <span className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden /> {formatDuration(service.durationMinutes)}
                </span>
                {service.location !== "business" && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                    <Home className="size-4" aria-hidden />
                    {service.location === "home" ? "A domicilio" : "En el local o a domicilio"}
                    {service.homeVisitFee > 0 && showPrice && ` (+${formatCurrency(service.homeVisitFee, currency)})`}
                  </span>
                )}
              </span>
            </span>
            {showPrice && (
              <span className="shrink-0 text-xl font-extrabold tracking-[-0.02em] tabular-nums">
                {formatCurrency(service.price, currency)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
