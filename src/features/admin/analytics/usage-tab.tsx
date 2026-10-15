import { Check, Copy, Minus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankedBars } from "@/features/reports/ranked-bars";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsSnapshot, BusinessAnalytics } from "@/types";
import { FEATURE_HINTS, FEATURE_KEYS, FEATURE_LABELS, formatCount, formatRate } from "./analytics-format";

const STICKY_HEAD = "sticky left-0 z-10 bg-muted pl-4 shadow-[inset_-1px_0_0_var(--border)]";
const STICKY_CELL = "sticky left-0 z-10 bg-background pl-4 shadow-[inset_-1px_0_0_var(--border)]";

/** Las frases para ventas con los totales de la plataforma, cada una con su botón «Copiar». */
function salesLines(snapshot: AnalyticsSnapshot): string[] {
  const { platform, periodDays } = snapshot;
  const period = `en los últimos ${periodDays} días`;
  return [
    `Agenda360 gestionó ${formatCount(platform.appointments)} citas ${period}.`,
    `Los pacientes reservaron ${formatCount(platform.online)} citas online, sin llamar ni escribir, ${period}.`,
    `Agenda360 envió ${formatCount(platform.reminders)} recordatorios de citas ${period}.`,
    `${formatCount(platform.confirmations)} pacientes confirmaron su cita con «Confirmo que voy» ${period}.`,
    `Los negocios registraron ${formatCount(platform.newClients)} pacientes nuevos ${period}.`,
  ];
}

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">{text}</p>
      <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-auto" onClick={copy}>
        {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar"}
      </Button>
    </li>
  );
}

function NameCell({ business }: { business: BusinessAnalytics }) {
  return (
    <TableCell className={STICKY_CELL}>
      <Link to={`/admin/businesses/${business.id}`} className="block max-w-36 truncate font-medium hover:underline sm:max-w-56">
        {business.name}
      </Link>
    </TableCell>
  );
}

/** «25 % → 12 % desde el 3 sep» (sólo con datos suficientes a cada lado). */
function beforeAfter(business: BusinessAnalytics): string {
  const { noShowBefore, noShowAfter, since } = business.value;
  if (noShowBefore === null || noShowAfter === null || !since) return "—";
  return `${formatRate(noShowBefore)} → ${formatRate(noShowAfter)}`;
}

/**
 * Pestaña «Uso y valor» (Historia 4): los totales de la plataforma listos para ventas, la adopción de cada
 * función, qué funciones usa cada negocio activo y el valor del periodo (con las inasistencias antes y
 * después de los recordatorios o «Confirmo que voy», sólo si hay datos suficientes).
 */
export function UsageTab({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const active = snapshot.businesses
    .filter((business) => business.status === "active")
    .sort((a, b) => b.value.appointments - a.value.appointments || a.name.localeCompare(b.name, "es"));
  const { adoption, businesses } = snapshot.platform;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Para ventas</CardTitle>
            <CardDescription>Los totales de la plataforma en el periodo, de todos los negocios, listos para copiar.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="-mx-4 divide-y">
              {salesLines(snapshot).map((line) => (
                <CopyLine key={line} text={line} />
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Adopción de cada función</CardTitle>
            <CardDescription>
              Negocios activos que la usaron en el periodo, de {businesses.active}. A quién enseñarle lo que no usa: en la tabla de abajo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBars
              max={1}
              items={[...FEATURE_KEYS]
                .sort((a, b) => adoption[b].rate - adoption[a].rate)
                .map((key) => ({
                  key,
                  label: FEATURE_LABELS[key],
                  value: adoption[key].rate,
                  detail: `${adoption[key].businesses} · ${formatRate(adoption[key].rate)}`,
                }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funciones de cada negocio</CardTitle>
          <CardDescription>Qué usó cada negocio activo en el periodo (pasa el ratón por una función para ver qué cuenta).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border bg-background">
            <Table className="min-w-max">
              <caption className="sr-only">Funciones que usó cada negocio activo</caption>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className={STICKY_HEAD}>Negocio</TableHead>
                  {FEATURE_KEYS.map((key) => (
                    <TableHead key={key} className="px-3 text-center" title={FEATURE_HINTS[key]}>
                      {FEATURE_LABELS[key]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((business) => (
                  <TableRow key={business.id} className="hover:bg-transparent">
                    <NameCell business={business} />
                    {FEATURE_KEYS.map((key) => (
                      <TableCell key={key} className="px-3 text-center">
                        {business.features[key] ? (
                          <Check className="mx-auto size-4 text-emerald-700" aria-label="Sí" />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground/60" aria-label="No" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valor del periodo</CardTitle>
          <CardDescription>
            Lo que Agenda360 le dio a cada negocio activo. Las inasistencias antes y después comparan los 60 días anteriores y
            posteriores a su primer recordatorio o «Confirmo que voy», sólo con 20 citas cerradas o más a cada lado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border bg-background">
            <Table className="min-w-max">
              <caption className="sr-only">Valor del periodo de cada negocio activo</caption>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className={STICKY_HEAD}>Negocio</TableHead>
                  {["Citas gestionadas", "Reservas online", "Recordatorios", "Confirmaciones", "Cancelaciones con tiempo", "Inasistencias antes → después"].map(
                    (label) => (
                      <TableHead key={label} className="px-3 text-right">
                        {label}
                      </TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((business) => {
                  const { value } = business;
                  const improved = value.noShowBefore !== null && value.noShowAfter !== null && value.noShowAfter < value.noShowBefore;
                  return (
                    <TableRow key={business.id} className="hover:bg-transparent">
                      <NameCell business={business} />
                      {[value.appointments, value.online, value.reminders, value.confirmations, value.timelyCancellations].map((amount, index) => (
                        <TableCell key={index} className="px-3 text-right tabular-nums">
                          {formatCount(amount)}
                        </TableCell>
                      ))}
                      <TableCell className={cn("px-3 text-right tabular-nums", improved && "font-semibold text-emerald-700")}>
                        {beforeAfter(business)}
                        {value.since && value.noShowBefore !== null && (
                          <span className="block text-[0.6875rem] font-normal text-muted-foreground">desde el {formatDate(value.since, "d MMM")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Cancelaciones con tiempo: las canceladas 24 horas o más antes de la cita, por el paciente o por el negocio. La hora quedó libre.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
