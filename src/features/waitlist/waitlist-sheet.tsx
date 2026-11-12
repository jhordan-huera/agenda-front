import { CalendarPlus, Hourglass, Mail, Phone, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useCloseWaitlistEntry, useWaitlist } from "@/hooks/queries/use-waitlist";
import { useMediaQuery } from "@/hooks/use-media-query";
import { describeDayParts, describeWaitlistDays } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import { formatDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildWaitlistWhatsAppMessage, getWhatsAppUrl } from "@/lib/whatsapp";
import type { Business, WaitlistEntry } from "@/types";
import { WaitlistEntryDialog } from "./waitlist-entry-dialog";

/**
 * La lista de espera del panel (spec 047): a la derecha en el computador y desde abajo en el celular. Con
 * varias agendas, la de la agenda elegida y las de «Cualquiera». Cada persona: escribirle por WhatsApp,
 * «Agendar» (la cita nueva con sus datos; al guardarla, sale de la lista) y «Quitar». «Anotar», arriba.
 */
export function WaitlistSheet({
  open,
  onOpenChange,
  business,
  agendaId,
  onSchedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: Business;
  /** La agenda que se está viendo (null: todas). */
  agendaId: string | null;
  onSchedule: (entry: WaitlistEntry) => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const query = useWaitlist(true);
  const agendas = useAgendas();
  const { servicesById } = useLookups();
  const close = useCloseWaitlistEntry();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<WaitlistEntry | null>(null);
  const entries = (query.data ?? []).filter((entry) => !agendaId || entry.professionalId === agendaId || entry.professionalId === null);
  const agendaName = agendaId ? agendas.byId(agendaId)?.displayName : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={isDesktop ? "right" : "bottom"} className={cn("gap-0 p-0", isDesktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl")}>
          <SheetHeader className="gap-1 border-b pr-12">
            <SheetTitle className="text-lg leading-snug font-semibold">Lista de espera</SheetTitle>
            <SheetDescription>
              {query.isPending
                ? "Cargando…"
                : `${entries.length === 1 ? "1 persona espera" : `${entries.length} personas esperan`}${agendaName ? ` con ${agendaName} o con cualquiera` : ""}. Cuando se libera una hora que les sirve, les avisamos por email.`}
            </SheetDescription>
            <Button size="sm" variant="outline" className="mt-2 self-start" onClick={() => setAdding(true)}>
              <UserPlus /> Anotar
            </Button>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {query.isPending ? (
              Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)
            ) : query.isError ? (
              <ErrorState onRetry={() => query.refetch()} />
            ) : entries.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                <Hourglass className="mx-auto mb-2 size-6 text-ink" aria-hidden />
                Nadie está en la lista de espera. Tus pacientes se anotan desde la página de reservas, o anótalos tú con «Anotar».
              </div>
            ) : (
              entries.map((entry) => {
                const serviceName = servicesById.get(entry.serviceId)?.name ?? "Servicio";
                const professionalName = entry.professionalId ? agendas.byId(entry.professionalId)?.displayName : "Cualquier profesional";
                const whatsAppUrl = entry.phone
                  ? getWhatsAppUrl(entry.phone, business.timezone, buildWaitlistWhatsAppMessage({ name: entry.name, businessName: business.name, serviceName }))
                  : null;
                return (
                  <article key={entry.id} className="space-y-3 rounded-xl border bg-card p-4" aria-label={entry.name}>
                    <div>
                      <p className="font-semibold">{entry.name}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {entry.email && (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Mail className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{entry.email}</span>
                          </span>
                        )}
                        {entry.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3.5" aria-hidden /> {entry.phone}
                          </span>
                        )}
                      </p>
                    </div>
                    <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Servicio</dt>
                      <dd className="min-w-0">{serviceName}</dd>
                      {agendas.multiple && (
                        <>
                          <dt className="text-muted-foreground">Con</dt>
                          <dd className="min-w-0">{professionalName}</dd>
                        </>
                      )}
                      <dt className="text-muted-foreground">Le sirve</dt>
                      <dd className="min-w-0">
                        {describeWaitlistDays(entry.days)}, {describeDayParts(entry.dayParts).toLowerCase()}
                      </dd>
                      <dt className="text-muted-foreground">Hasta</dt>
                      <dd>{formatDate(entry.until, "d 'de' MMMM")}</dd>
                      <dt className="text-muted-foreground">Espera desde</dt>
                      <dd>
                        {formatShortDate(entry.createdAt.slice(0, 10))}
                        {entry.source === "booking_page" ? " · desde la página" : ""}
                      </dd>
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {whatsAppUrl && (
                        <Button asChild size="sm" variant="outline">
                          <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                            <WhatsAppIcon /> WhatsApp
                          </a>
                        </Button>
                      )}
                      <Button size="sm" onClick={() => onSchedule(entry)}>
                        <CalendarPlus /> Agendar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(entry)}>
                        <Trash2 /> Quitar
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
      <WaitlistEntryDialog open={adding} onOpenChange={setAdding} business={business} defaultProfessionalId={agendaId} />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`¿Quitar a ${removing?.name ?? "esta persona"} de la lista de espera?`}
        description="Ya no le avisaremos cuando se libere una hora. Queda en la actividad."
        confirmLabel="Quitar"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          try {
            await close.mutateAsync({ entryId: removing.id, reason: "removed" });
            toast.success(`${removing.name.split(" ")[0]} salió de la lista de espera`);
            setRemoving(null);
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </>
  );
}
