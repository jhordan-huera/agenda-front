import { MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { getPlaceMapsUrl } from "@/lib/maps";
import { getBusinessWhatsAppUrl } from "@/lib/whatsapp";
import type { PublicBusiness, PublicProfessional } from "@/types";

export function BookingHeader({ business, professional }: { business: PublicBusiness; professional: PublicProfessional }) {
  const whatsAppUrl = getBusinessWhatsAppUrl(business);

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-end sm:justify-between sm:py-10">
        <div className="flex min-w-0 items-start gap-4">
          {business.logoUrl && (
            <img src={business.logoUrl} alt={`Logo de ${business.name}`} className="size-14 shrink-0 rounded-xl border object-cover" />
          )}
          <div className="min-w-0">
            <h1 className="text-3xl leading-tight font-extrabold tracking-[-0.02em] sm:text-4xl">{business.name}</h1>
            <p className="mt-1 flex flex-wrap gap-x-2">
              <span className="font-semibold">{professional.displayName}</span>
              {professional.title && <span className="text-muted-foreground">{professional.title}</span>}
            </p>
            {business.description && <p className="mt-3 max-w-2xl leading-relaxed text-foreground/85">{business.description}</p>}
            {(business.address || business.phone) && (
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {business.address && (
                  <a
                    href={getPlaceMapsUrl(business)}
                    target="_blank"
                    rel="noreferrer"
                    title="Ver en Google Maps"
                    className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"
                  >
                    <MapPin className="size-4" aria-hidden /> {business.address}
                  </a>
                )}
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="inline-flex items-center gap-1.5 tabular-nums hover:text-foreground">
                    <Phone className="size-4" aria-hidden /> {business.phone}
                  </a>
                )}
              </p>
            )}
          </div>
        </div>
        {whatsAppUrl && (
          <Button asChild variant="outline" size="lg" className="h-11 self-start px-4 sm:self-end">
            <a href={whatsAppUrl} target="_blank" rel="noreferrer">
              <WhatsAppIcon /> Escríbenos por WhatsApp
            </a>
          </Button>
        )}
      </div>
    </header>
  );
}
