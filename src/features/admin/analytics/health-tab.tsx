import { ArrowRight, HeartPulse, Mail, Phone, ShieldAlert, Siren, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/lib/format";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import type { AnalyticsSnapshot, BusinessAnalytics, HealthGroup } from "@/types";
import { PlanBadge } from "../business-badges";
import { nextPlan } from "../sales-lists";
import { StatGrid } from "../stat-cards";
import { formatGrowth } from "./analytics-format";
import { HealthBadge } from "./analytics-parts";

const GROUP_ORDER: Record<HealthGroup, number> = { critical: 0, risk: 1, healthy: 2 };

/** Para llamar al propietario: teléfono, WhatsApp (con el saludo ya escrito) y email. Sólo su contacto. */
function OwnerContact({ business }: { business: BusinessAnalytics }) {
  const { owner } = business;
  if (!owner) return <p className="text-xs text-muted-foreground">Sin propietario: agrégalo desde su ficha.</p>;
  const firstName = owner.name.split(" ")[0];
  const whatsapp = owner.phone
    ? getWhatsAppUrl(owner.phone, business.timezone, `Hola ${firstName}, te escribo de Agenda360 para saber cómo te va con ${business.name}.`)
    : null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 text-xs">
        <span className="font-medium">{owner.name}</span>
        <span className="block truncate text-muted-foreground">
          {owner.phone || "Sin teléfono"} · {owner.email}
        </span>
      </p>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {owner.phone && (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${owner.phone.replace(/[^\d+]/g, "")}`} aria-label={`Llamar a ${owner.name}`}>
              <Phone /> Llamar
            </a>
          </Button>
        )}
        {whatsapp && (
          <Button asChild variant="outline" size="sm">
            <a href={whatsapp} target="_blank" rel="noreferrer" aria-label={`Escribir por WhatsApp a ${owner.name}`}>
              <WhatsAppIcon className="size-3.5" /> WhatsApp
            </a>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <a href={`mailto:${owner.email}`} aria-label={`Escribir un email a ${owner.name}`}>
            <Mail /> Email
          </a>
        </Button>
      </div>
    </div>
  );
}

function BusinessName({ business }: { business: BusinessAnalytics }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <Link to={`/admin/businesses/${business.id}`} className="truncate text-sm font-semibold hover:underline">
        {business.name}
      </Link>
      <PlanBadge plan={business.plan} />
      <span className="text-xs text-muted-foreground">{business.category.name}</span>
    </span>
  );
}

/**
 * Pestaña «Salud y ventas» (Historia 3): cuántos negocios activos están sanos, en riesgo o críticos; la
 * lista «En riesgo» (los críticos primero, con los motivos y el contacto del propietario) y «Listos para
 * subir de plan», con su motivo. «Negocios para vender» del Inicio sigue igual.
 */
export function HealthTab({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const active = snapshot.businesses.filter((business) => business.status === "active");
  const inGroup = (group: HealthGroup) => active.filter((business) => business.health.group === group).length;
  const atRisk = active
    .filter((business) => business.health.group !== "healthy")
    .sort((a, b) => GROUP_ORDER[a.health.group] - GROUP_ORDER[b.health.group] || a.health.score - b.health.score || a.name.localeCompare(b.name, "es"));
  const ready = active
    .filter((business) => business.upsell.length > 0)
    .sort((a, b) => b.upsell.length - a.upsell.length || b.appointments - a.appointments || a.name.localeCompare(b.name, "es"));

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          { label: "Sanos", value: inGroup("healthy"), icon: HeartPulse, tone: "success", hint: "De 70 a 100 puntos" },
          { label: "En riesgo", value: inGroup("risk"), icon: ShieldAlert, tone: inGroup("risk") ? "warning" : "default", hint: "De 40 a 69 puntos" },
          { label: "Críticos", value: inGroup("critical"), icon: Siren, tone: inGroup("critical") ? "danger" : "default", hint: "Menos de 40 puntos" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle>En riesgo</CardTitle>
            <CardDescription>
              Los que pueden irse, los críticos primero. La puntuación parte de 100 y resta por cada señal: aquí están sus motivos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos los negocios activos están sanos.</p>
            ) : (
              <ul className="-mx-4 divide-y" aria-label="Negocios en riesgo">
                {atRisk.map((business) => (
                  <li key={business.id} className="space-y-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <BusinessName business={business} />
                      <HealthBadge score={business.health.score} group={business.health.group} className="shrink-0" />
                    </div>
                    <ul className="list-disc space-y-0.5 pl-5 text-sm">
                      {business.health.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <OwnerContact business={business} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listos para subir de plan</CardTitle>
            <CardDescription>Cerca del tope, crecen rápido, usan todo su equipo o sus agendas, o tienen mucha demanda.</CardDescription>
          </CardHeader>
          <CardContent>
            {ready.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ningún negocio está listo para subir de plan todavía.</p>
            ) : (
              <ul className="-mx-4 divide-y" aria-label="Listos para subir de plan">
                {ready.map((business) => {
                  const offer = nextPlan(business.plan);
                  return (
                    <li key={business.id} className="space-y-2 px-4 py-3">
                      <BusinessName business={business} />
                      <ul className="space-y-0.5 text-sm">
                        {business.upsell.map((reason) => (
                          <li key={reason} className="flex items-start gap-1.5">
                            <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-emerald-700" aria-hidden />
                            {reason}
                          </li>
                        ))}
                      </ul>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {offer ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-primary">
                            <ArrowRight className="size-3.5" aria-hidden /> Ofrecerle {offer.name}
                          </span>
                        ) : (
                          <span className="font-semibold text-primary">Ofrecerle más agendas</span>
                        )}
                        <span>
                          {plural(business.appointments, "cita", "citas")} · {formatGrowth(business.growth)}
                        </span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
