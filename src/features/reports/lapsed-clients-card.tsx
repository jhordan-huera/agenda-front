import { UserRoundX } from "lucide-react";
import { useState } from "react";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatShortDate, plural } from "@/lib/format";
import { daysBetween } from "@/lib/time";
import { buildWinBackMessage, getWhatsAppUrl } from "@/lib/whatsapp";
import type { Business, Client, ISODate } from "@/types";
import { LAPSED_THRESHOLDS, type LapsedClient, type LapsedThreshold } from "./report-insights";
import { ClientName } from "./top-clients-cards";

const PAGE = 10;

/**
 * Pacientes que dejaron de venir (sin cita desde hace 30, 60 o 90 días y ninguna por delante), con un
 * WhatsApp listo para invitarlos a reservar. Mira todo su historial, no sólo el periodo.
 */
export function LapsedClientsCard({
  lapsed,
  threshold,
  onThresholdChange,
  clientsById,
  business,
  today,
}: {
  /** Ya calculada con `getLapsedClients` (la página la comparte con el documento impreso). */
  lapsed: LapsedClient[];
  threshold: LapsedThreshold;
  onThresholdChange: (threshold: LapsedThreshold) => void;
  clientsById: Map<string, Client>;
  business: Pick<Business, "name" | "slug" | "timezone">;
  today: ISODate;
}) {
  const [shown, setShown] = useState(PAGE);
  const bookingUrl = `${window.location.origin}/book/${business.slug}`;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Pacientes que no volvieron</CardTitle>
          <CardDescription>
            Vinieron alguna vez, pero no tienen cita desde hace más de {threshold} días ni una próxima. Escríbeles para
            invitarlos a volver.
          </CardDescription>
        </div>
        <Tabs
          value={String(threshold)}
          onValueChange={(value) => {
            onThresholdChange(Number(value) as LapsedThreshold);
            setShown(PAGE);
          }}
        >
          <TabsList aria-label="Sin venir desde hace">
            {LAPSED_THRESHOLDS.map((days) => (
              <TabsTrigger key={days} value={String(days)} className="px-3">
                {days} días
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {lapsed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <UserRoundX className="size-6" aria-hidden />
            Ningún paciente lleva más de {threshold} días sin venir.
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{plural(lapsed.length, "paciente", "pacientes")}</p>
            <ul className="divide-y rounded-lg border">
              {lapsed.slice(0, shown).map((item) => {
                const client = clientsById.get(item.clientId);
                const whatsAppUrl =
                  client && !client.restricted && client.phone
                    ? getWhatsAppUrl(client.phone, business.timezone, buildWinBackMessage({ clientName: client.name, businessName: business.name, bookingUrl }))
                    : null;
                return (
                  <li key={item.clientId} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <ClientName clientId={item.clientId} clientsById={clientsById} />
                      <p className="text-xs text-muted-foreground">
                        Última visita: {formatShortDate(item.lastVisit)} (hace {daysBetween(item.lastVisit, today)} días) ·{" "}
                        {plural(item.visits, "cita", "citas")}
                      </p>
                    </div>
                    {whatsAppUrl && (
                      <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
                        <a href={whatsAppUrl} target="_blank" rel="noreferrer">
                          <WhatsAppIcon className="size-4" /> Escribir por WhatsApp
                        </a>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
            {shown < lapsed.length && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShown(shown + PAGE)}>
                Ver más ({lapsed.length - shown})
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
