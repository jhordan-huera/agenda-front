import { CircleAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { summarizeToday, type SummaryAction, type TodayHealth } from "./today-summary";

/** Los intentos fallidos de la frase llevan a Seguridad con «Sólo intentos fallidos». */
const SECURITY_LINK: SummaryAction = { label: "Ver los intentos fallidos", tab: "security", onlyFailed: true };

/** Las cifras de los emails, en negrita: «Salieron **46** emails y **3** están en cola». */
function Emphasized({ text }: { text: string }) {
  return text.split(/(\d[\d.]*)/).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-foreground tabular-nums">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * Cómo va hoy, en una frase, arriba de /admin → Actividad (spec 049): reemplaza las cuatro tarjetas de cifras.
 * Sin problemas, «Todo en orden hoy»; con emails fallidos o cuentas en alerta, el título en rojo y un botón.
 */
export function TodaySummaryCard({ health, onAction }: { health: TodayHealth; onAction: (action: SummaryAction) => void }) {
  const summary = summarizeToday(health);
  const alert = summary.tone === "alert";
  const Icon = alert ? CircleAlert : ShieldCheck;

  return (
    <section
      aria-labelledby="actividad-hoy"
      className="flex flex-wrap items-start gap-x-4 gap-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:px-5"
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          alert ? "bg-destructive/10 text-destructive" : "bg-accent text-ink",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-[1_1_16rem]">
        <h2 id="actividad-hoy" className={cn("text-[0.9375rem] font-semibold", alert && "text-destructive")}>
          {summary.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          <Emphasized text={summary.emails} />{" "}
          {summary.security.map((piece, index) =>
            piece.link ? (
              <button
                key={index}
                type="button"
                onClick={() => onAction(SECURITY_LINK)}
                className="rounded-sm font-semibold text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {piece.text}
              </button>
            ) : (
              <span key={index}>{piece.text}</span>
            ),
          )}
        </p>
      </div>
      {summary.action && (
        <Button type="button" variant="outline" size="sm" className="self-center" onClick={() => onAction(summary.action!)}>
          {summary.action.label}
        </Button>
      )}
    </section>
  );
}
