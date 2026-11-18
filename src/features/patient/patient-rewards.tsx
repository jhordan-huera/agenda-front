import { Gift, Star } from "lucide-react";
import { plural } from "@/lib/format";
import type { PatientCard, PatientReward } from "@/types";
import { dayOf } from "./patient-card-text";
import { PatientDisclosure } from "./patient-disclosure";

/**
 * «Tus premios» (spec 052): los disponibles con su código (grande, para leerlo en voz alta) y los que todavía faltan
 * en esta tarjeta; abajo, en un desplegable, los ya canjeados, vencidos o anulados.
 */
export function PatientRewards({ card }: { card: PatientCard }) {
  const timezone = card.business.timezone;
  const available = card.rewards.filter((reward) => reward.status === "available");
  const past = card.rewards.filter((reward) => reward.status !== "available");
  const locked = card.benefits.filter((benefit) => benefit.visitsRequired > card.stamps);
  const last = card.benefits.at(-1)?.visitsRequired ?? null;

  return (
    <>
      <section aria-labelledby="patient-rewards-title" className="mt-6">
        <h2 id="patient-rewards-title" className="text-[0.9375rem] font-bold">
          Tus premios
        </h2>
        {available.length + locked.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {card.benefits.length === 0 ? "Todavía no hay premios en esta tarjeta." : "Por ahora no tienes premios por usar."}
          </p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {available.map((reward) => (
              <li key={reward.id} className="rounded-2xl border bg-card p-3.5">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Gift className="size-5" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug font-semibold break-words">{reward.name}</p>
                    {reward.description && <p className="mt-0.5 text-xs text-muted-foreground">{reward.description}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {reward.expiresAt ? `Vence el ${dayOf(reward.expiresAt, timezone)}` : "No vence"}
                    </p>
                    {reward.conditions && <p className="mt-0.5 text-xs text-muted-foreground">Condiciones: {reward.conditions}</p>}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-ink">Disponible</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-accent px-3 py-2.5 text-accent-foreground">
                  <span className="text-xs">Tu código para usarlo</span>
                  <span className="text-2xl leading-none font-bold">{reward.code}</span>
                </div>
              </li>
            ))}
            {locked.map((benefit) => {
              const PrizeIcon = benefit.visitsRequired === last ? Star : Gift;
              return (
                <li key={benefit.visitsRequired} className="flex items-center gap-3 rounded-2xl border bg-card px-3.5 py-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <PrizeIcon className="size-5" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug font-semibold break-words">{benefit.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      A las {plural(benefit.visitsRequired, "cita", "citas")}: te {benefit.visitsRequired - card.stamps === 1 ? "falta" : "faltan"}{" "}
                      {benefit.visitsRequired - card.stamps}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">Bloqueado</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <PatientDisclosure title="Premios anteriores" count={past.length}>
          <ul className="divide-y">
            {past.map((reward) => (
              <li key={reward.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm text-muted-foreground">
                <span className="min-w-0 break-words">{reward.name}</span>
                <span className="shrink-0 text-xs">{pastStatus(reward, timezone)}</span>
              </li>
            ))}
          </ul>
        </PatientDisclosure>
      )}
    </>
  );
}

/** «Canjeado el 3 de noviembre», «Venció el 2 de diciembre» o «Anulado». */
function pastStatus(reward: PatientReward, timezone: string): string {
  if (reward.status === "redeemed") return reward.redeemedAt ? `Canjeado el ${dayOf(reward.redeemedAt, timezone)}` : "Canjeado";
  if (reward.status === "expired") return reward.expiresAt ? `Venció el ${dayOf(reward.expiresAt, timezone)}` : "Vencido";
  return "Anulado";
}
