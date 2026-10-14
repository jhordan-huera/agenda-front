import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminView } from "./use-view-preference";

const OPTIONS: { value: AdminView; label: string; icon: typeof List }[] = [
  { value: "tarjetas", label: "Tarjetas", icon: LayoutGrid },
  { value: "lista", label: "Lista", icon: List },
];

/** Tarjetas o lista (spec 007). Sólo desde tablets: en el celular siempre se ven tarjetas. */
export function ViewToggle({ value, onChange }: { value: AdminView; onChange: (view: AdminView) => void }) {
  return (
    <div role="radiogroup" aria-label="Cómo ver la lista" className="hidden h-9 shrink-0 items-center rounded-lg border bg-background p-0.5 md:inline-flex">
      {OPTIONS.map(({ value: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          onKeyDown={(event) => {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
              event.preventDefault();
              onChange(option === "tarjetas" ? "lista" : "tarjetas");
              (event.currentTarget.parentElement?.querySelector(`[aria-checked="false"]`) as HTMLElement | null)?.focus();
            }
          }}
          tabIndex={value === option ? 0 : -1}
          className={cn(
            "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            value === option && "bg-accent text-ink hover:text-ink",
          )}
        >
          <Icon className="size-4" aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}
