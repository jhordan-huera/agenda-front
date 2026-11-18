import { Gift, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StampIcon } from "@/features/loyalty/stamp-icon";
import { LOYALTY_LEVELS } from "@/lib/constants/loyalty";
import { joinNames } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PatientCard, StampIcon as StampIconName } from "@/types";
import { cardSlots, nextPrizeText, type CardSlot } from "./patient-card-text";

/**
 * «Tu tarjeta» (spec 052, diseño B «Tarjeta clara»): el nivel (si el programa empieza tarjetas nuevas), las casillas
 * en filas de 5 y el avance hasta el próximo premio, con los colores del consultorio.
 */
export function PatientLoyaltyCard({ card }: { card: PatientCard }) {
  const slots = cardSlots(card);
  const stamped = Math.min(card.stamps, card.slots);
  const prizes = slots.filter((slot) => slot.prize).map((slot) => String(slot.number));
  const prizesText = prizes.length === 0 ? "" : ` Premio en ${prizes.length === 1 ? "la cita" : "las citas"} ${joinNames(prizes)}.`;

  return (
    <section aria-labelledby="patient-card-title" className="mt-4 rounded-[1.25rem] border bg-card px-4 pt-4.5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="patient-card-title" className="text-[0.8125rem] font-semibold text-foreground/80">
          Tu tarjeta
        </h2>
        {card.program.afterLast === "restart" && (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            Nivel {LOYALTY_LEVELS[card.level]}
          </span>
        )}
      </div>
      {/* Para el lector de pantalla, una frase en vez de cada casilla. */}
      <div role="img" aria-label={`${stamped} de ${card.slots} casillas con sello.${prizesText}`} className="mt-3.5 grid grid-cols-5 gap-2">
        {slots.map((slot) => (
          <Slot key={slot.number} slot={slot} stampIcon={card.program.stampIcon} />
        ))}
      </div>
      <Progress aria-hidden value={(stamped / card.slots) * 100} className="mt-3 h-2" />
      <p className="mt-2.5 text-[0.8125rem] leading-normal text-foreground/85">{nextPrizeText(card)}</p>
    </section>
  );
}

/**
 * Una casilla: con sello, el sello del consultorio en su color; la de un premio, el regalo (la estrella en la última),
 * llena y con un aro si ya se ganó; las que faltan, punteadas y con su número.
 */
function Slot({ slot, stampIcon }: { slot: CardSlot; stampIcon: StampIconName }) {
  const PrizeIcon = slot.prize === "star" ? Star : Gift;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex aspect-square w-full max-w-13 items-center justify-center rounded-full",
          slot.stamped && slot.prize
            ? "bg-primary text-primary-foreground ring-3 ring-primary/25"
            : slot.stamped
              ? "bg-primary text-primary-foreground"
              : slot.prize
                ? "border-[1.5px] border-primary bg-accent text-accent-foreground"
                : "border-[1.5px] border-dashed border-rule-strong bg-card text-muted-foreground",
        )}
      >
        {slot.prize ? (
          <PrizeIcon className="size-5.5" strokeWidth={1.8} aria-hidden />
        ) : slot.stamped ? (
          <StampIcon icon={stampIcon} className="size-5.5" strokeWidth={1.8} />
        ) : (
          <span className="text-sm font-medium">{slot.number}</span>
        )}
      </div>
      <span className="h-3 text-[0.6875rem] leading-none font-semibold text-ink">{slot.prize ? "Premio" : ""}</span>
    </div>
  );
}
