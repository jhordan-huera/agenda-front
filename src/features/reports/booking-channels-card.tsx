import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingChannels } from "./report-insights";
import { compareValues } from "./report-period";
import { RankedBars } from "./ranked-bars";
import { share } from "./report-stats";
import { Trend } from "./trend";

const percent = (value: number) => `${Math.round(value * 100)} %`;

/** Cuánto trae la página de reservas: citas que llegaron solas y pacientes nuevos que llegaron por ella. */
export function BookingChannelsCard({
  current,
  previous,
  previousLabel,
}: {
  current: BookingChannels;
  /** null: el periodo anterior no tiene datos. */
  previous: BookingChannels | null;
  previousLabel: string;
}) {
  const compare = (value: (channels: BookingChannels) => number) =>
    previous ? compareValues(value(current), value(previous), "up") : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas por tu página</CardTitle>
        <CardDescription>Citas del periodo (sin canceladas) que llegaron solas por tu enlace y las que creaste tú.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {current.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin citas en este periodo.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-3xl font-extrabold tracking-[-0.02em] tabular-nums">{percent(share(current.fromPage, current.total))}</p>
              <p className="text-sm text-muted-foreground">
                {current.fromPage} de {current.total} citas
              </p>
              <Trend comparison={compare((channels) => channels.fromPage)} previousLabel={previousLabel} />
            </div>
            <RankedBars
              max={current.total}
              items={[
                { key: "page", value: current.fromPage, label: <span className="font-medium">Por tu página</span>, detail: current.fromPage },
                { key: "panel", value: current.fromPanel, label: <span className="font-medium">Creadas en el panel</span>, detail: current.fromPanel },
              ]}
            />
            <p className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
              <span>
                Pacientes nuevos por tu página: <span className="font-semibold tabular-nums">{current.newFromPage}</span>
              </span>
              <Trend comparison={compare((channels) => channels.newFromPage)} previousLabel={previousLabel} />
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
