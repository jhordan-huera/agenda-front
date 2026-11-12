import { cn } from "@/lib/utils";

/** Un botón que se marca y desmarca (los días y las partes del día de la lista de espera, spec 047). */
export function ChoiceChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        pressed ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
