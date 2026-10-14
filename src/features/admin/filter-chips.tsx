import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  /** Cuántos quedan con esta opción (con la búsqueda y los demás filtros). */
  count: number;
}

interface FilterChipsProps<T extends string> {
  /** Para el lector de pantalla: «Plan», «Estado»… */
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Filtro en botones con su número (spec 007): un grupo de radio, con las flechas para moverse y una
 * sola parada del tabulador.
 */
export function FilterChips<T extends string>({ label, options, value, onChange }: FilterChipsProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function move(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border bg-background pr-1.5 pl-3 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
              checked && "border-primary bg-accent text-ink hover:bg-accent",
            )}
          >
            {option.label}
            <span
              className={cn(
                "min-w-5 rounded-full bg-muted px-1.5 text-center text-xs leading-5 text-muted-foreground tabular-nums",
                checked && "bg-background text-ink",
              )}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
