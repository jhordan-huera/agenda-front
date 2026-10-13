import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, plural } from "@/lib/format";
import type { Client } from "@/types";
import { RankedBars } from "./ranked-bars";
import type { ClientRank } from "./report-insights";

const percent = (value: number) => `${Math.round(value * 100)} %`;

/** El nombre con enlace a su ficha (los pacientes aún restringidos, sólo el nombre). */
export function ClientName({ clientId, clientsById }: { clientId: string; clientsById: Map<string, Client> }) {
  const client = clientsById.get(clientId);
  if (!client) return <span className="font-medium text-muted-foreground">Paciente</span>;
  if (client.restricted) return <span className="font-medium">{client.name}</span>;
  return (
    <Link to={`/dashboard/clients/${client.id}`} className="font-medium hover:underline">
      {client.name}
    </Link>
  );
}

/** Los pacientes que más vienen (y lo que dejan) y los que más faltan sin avisar, en el periodo. */
export function TopClientsCards({
  top,
  noShows,
  clientsById,
  currency,
}: {
  top: ClientRank[];
  noShows: ClientRank[];
  clientsById: Map<string, Client>;
  currency?: string;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Los que más vienen</CardTitle>
          <CardDescription>Pacientes con más citas en el periodo (sin canceladas) y lo cobrado en las completadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin citas en este periodo.</p>
          ) : (
            <RankedBars
              items={top.map((rank) => ({
                key: rank.clientId,
                value: rank.appointments,
                label: <ClientName clientId={rank.clientId} clientsById={clientsById} />,
                detail: `${plural(rank.appointments, "cita", "citas")} · ${formatCurrency(rank.spent, currency)}`,
              }))}
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Los que más faltan</CardTitle>
          <CardDescription>Pacientes que no vinieron sin avisar en el periodo, con su asistencia.</CardDescription>
        </CardHeader>
        <CardContent>
          {noShows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nadie faltó en este periodo.</p>
          ) : (
            <RankedBars
              items={noShows.map((rank) => ({
                key: rank.clientId,
                value: rank.noShow,
                label: <ClientName clientId={rank.clientId} clientsById={clientsById} />,
                detail: `${plural(rank.noShow, "falta", "faltas")}${rank.attendance === null ? "" : ` · asistencia ${percent(rank.attendance)}`}`,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
