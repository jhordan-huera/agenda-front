import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CARD_META, CARD_TITLE } from "./orbit-card-styles";

/** Las piezas de las tarjetas de la órbita (orbit-cards.tsx): una etiqueta y una fila con icono. */

export function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "brand" | "confirmed" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        tone === "brand" && "bg-ink text-primary-foreground",
        tone === "confirmed" && "bg-confirmed/15 text-confirmed",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function Row({ icon, title, meta }: { icon: ReactNode; title: string; meta: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-ink">{icon}</span>
      <span className="min-w-0">
        <span className={cn(CARD_TITLE, "block truncate")}>{title}</span>
        <span className={cn(CARD_META, "block truncate")}>{meta}</span>
      </span>
    </div>
  );
}
