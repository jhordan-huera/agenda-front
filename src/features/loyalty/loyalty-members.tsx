import { Search, Smartphone, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyMembers } from "@/hooks/queries/use-loyalty";
import { LOYALTY_LEVELS } from "@/lib/constants/loyalty";
import { normalizeSearch } from "@/lib/format";
import { buildLoyaltyWhatsAppMessage, getWhatsAppUrl } from "@/lib/whatsapp";
import type { Business, LoyaltyMember, LoyaltyProgram } from "@/types";
import { availableLabel, describeMissing, stampsLabel } from "./loyalty-text";

const PAGE = 20;

/**
 * «Pacientes» de Fidelización (spec 052): cada paciente con sellos (o con cuenta unida), su nivel, el próximo premio
 * y cuánto le falta; los que les falta menos, primero. El WhatsApp va ya escrito, con el enlace para reservar.
 */
export function LoyaltyMembers({ business, program }: { business: Business; program: LoyaltyProgram }) {
  const query = useLoyaltyMembers();
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const term = normalizeSearch(search.trim());
  const members = (query.data ?? []).filter((member) => !term || normalizeSearch(member.clientName).includes(term));
  const bookingUrl = `${window.location.origin}/book/${business.slug}`;

  const whatsAppUrl = (member: LoyaltyMember) =>
    member.clientPhone
      ? getWhatsAppUrl(
          member.clientPhone,
          business.timezone,
          buildLoyaltyWhatsAppMessage({
            clientName: member.clientName,
            businessName: business.name,
            programName: program.name,
            stamps: member.stamps,
            next: member.next,
            availableRewards: member.availableRewards,
            bookingUrl,
          }),
        )
      : null;

  if (query.isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if ((query.data ?? []).length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Todavía nadie tiene sellos"
        description={
          program.enabled
            ? "Cada cita atendida suma un sello a cada paciente de la cita. Aquí verás cuánto le falta a cada uno."
            : "Enciende la tarjeta en «Programa»: desde entonces, cada cita atendida suma un sello."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Los que les falta menos para su próximo premio, primero.</p>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar paciente"
            placeholder="Buscar paciente"
            className="pl-8"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setShown(PAGE);
            }}
          />
        </div>
      </div>

      {members.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Ningún paciente con ese nombre.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {members.slice(0, shown).map((member) => {
            const url = whatsAppUrl(member);
            const showLevel = program.afterLast === "restart" || member.level !== "classic";
            return (
              <li key={member.clientId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/dashboard/clients/${member.clientId}`} className="font-medium hover:underline">
                      {member.clientName}
                    </Link>
                    {showLevel && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">{LOYALTY_LEVELS[member.level]}</span>
                    )}
                    {member.hasAccount && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Smartphone className="size-3.5" aria-hidden /> Con cuenta
                      </span>
                    )}
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold tabular-nums">{stampsLabel(member.stamps)}</span>
                    {member.next ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · Próximo: «{member.next.name}» · {describeMissing(member.next.missing).toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground"> · Sin más premios en esta tarjeta</span>
                    )}
                  </p>
                  {member.availableRewards > 0 && <p className="text-xs font-medium text-ink">{availableLabel(member.availableRewards)}</p>}
                </div>
                {url && (
                  <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Escribir a ${member.clientName} por WhatsApp`}>
                      <WhatsAppIcon className="size-4" /> WhatsApp
                    </a>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {shown < members.length && (
        <Button variant="ghost" size="sm" onClick={() => setShown(shown + PAGE)}>
          Ver más ({members.length - shown})
        </Button>
      )}
    </div>
  );
}
