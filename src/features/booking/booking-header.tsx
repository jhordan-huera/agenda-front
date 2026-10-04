import { MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/queries/use-categories";
import { getInitials } from "@/lib/format";
import { getPlaceMapsUrl } from "@/lib/maps";
import { getBusinessWhatsAppUrl } from "@/lib/whatsapp";
import type { Business, Professional } from "@/types";

export function BookingHeader({ business, professional }: { business: Business; professional: Professional }) {
  const whatsAppUrl = getBusinessWhatsAppUrl(business);
  const categoryLabel = useCategories().label(business.category);

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:py-8">
        {business.logoUrl ? (
          <img
            src={business.logoUrl}
            alt={`Logo de ${business.name}`}
            className="size-16 shrink-0 rounded-2xl border object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-xl font-semibold text-accent-foreground"
          >
            {getInitials(business.name)}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          {categoryLabel && <p className="text-xs font-medium tracking-wide text-primary uppercase">{categoryLabel}</p>}
          <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
          <p className="text-sm text-muted-foreground">
            Con {professional.displayName}
            {professional.title && ` · ${professional.title}`}
          </p>
          {business.description && <p className="max-w-2xl pt-1 text-sm text-foreground/80">{business.description}</p>}
          {(business.address || business.phone) && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
              {business.address && (
                <a
                  href={getPlaceMapsUrl(business)}
                  target="_blank"
                  rel="noreferrer"
                  title="Ver en Google Maps"
                  className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
                >
                  <MapPin className="size-3.5" aria-hidden /> {business.address}
                </a>
              )}
              {business.phone && (
                <a href={`tel:${business.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="size-3.5" aria-hidden /> {business.phone}
                </a>
              )}
            </p>
          )}
        </div>
        {whatsAppUrl && (
          <Button asChild variant="outline" size="lg" className="self-start sm:self-center">
            <a href={whatsAppUrl} target="_blank" rel="noreferrer">
              <WhatsAppIcon /> Escríbenos por WhatsApp
            </a>
          </Button>
        )}
      </div>
    </header>
  );
}
