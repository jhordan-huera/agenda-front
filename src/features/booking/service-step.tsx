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
    <div role="radiogroup" aria-label="Servicios" className="grid gap-3">
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
              "flex items-start justify-between gap-4 rounded-xl border bg-background p-4 text-left transition-colors outline-none hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50",
              selected && "border-primary bg-accent/60 ring-1 ring-primary",
            )}
          >
            <span className="min-w-0 space-y-1">
              <span className="block font-medium">{service.name}</span>
              {service.description && (
                <span className="line-clamp-2 block text-sm text-muted-foreground">{service.description}</span>
              )}
              <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden /> {formatDuration(service.durationMinutes)}
                </span>
                {service.location !== "business" && (
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <Home className="size-3.5" aria-hidden />
                    {service.location === "home" ? "A domicilio" : "En el local o a domicilio"}
                    {service.homeVisitFee > 0 && showPrice && ` (+${formatCurrency(service.homeVisitFee, currency)})`}
                  </span>
                )}
              </span>
            </span>
            {showPrice && (
              <span className="shrink-0 text-lg font-semibold tabular-nums">{formatCurrency(service.price, currency)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
