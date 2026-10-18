import { Check, ChevronDown, Search, X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import type { FieldControlProps } from "@/components/shared/form-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdminBusinesses } from "@/hooks/queries/use-admin";
import { normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminBusinessSummary } from "@/types";

interface ReferrerComboboxProps extends Partial<FieldControlProps> {
  /** El negocio que lo recomendó (id) o null: nadie. */
  value: string | null;
  onChange: (businessId: string | null) => void;
  /** El propio negocio, que no puede recomendarse a sí mismo (en el alta todavía no existe). */
  excludeId?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * «Recomendado por» (spec 023): un buscador de negocios por su nombre, su enlace de reservas o su código
 * de referidos (el que trae el WhatsApp de «Quiero mi agenda»: «Me recomendó … (código ABC234)»). Teclado:
 * ↑ ↓ Enter. «Nadie» lo quita.
 */
export function ReferrerCombobox({ value, onChange, excludeId, disabled, className, ...field }: ReferrerComboboxProps) {
  const listId = useId();
  const businesses = useAdminBusinesses();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const options = (businesses.data ?? []).filter((summary) => summary.business.id !== excludeId);
  const selected = options.find((summary) => summary.business.id === value);
  const term = normalizeSearch(query.trim());
  const results = term
    ? options.filter((summary) =>
        [summary.business.name, summary.business.slug, summary.referralCode].some((text) => normalizeSearch(text ?? "").includes(term)),
      )
    : options;
  const optionId = (index: number) => `${listId}-option-${index}`;

  const openChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      // Al abrir, se resalta el negocio ya elegido.
      setActiveIndex(Math.max(0, options.findIndex((summary) => summary.business.id === value)));
    }
  };

  const select = (summary: AdminBusinessSummary | null) => {
    onChange(summary?.business.id ?? null);
    setOpen(false);
  };

  const moveTo = (index: number) => {
    setActiveIndex(index);
    document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      moveTo((activeIndex + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      moveTo((activeIndex - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      // Enter elige el resaltado y nunca envía el formulario del negocio.
      event.preventDefault();
      const summary = results[activeIndex];
      if (summary) select(summary);
    }
  };

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {/* `modal`: dentro de un diálogo, permite desplazar la lista con la rueda del ratón. */}
      <Popover open={open} onOpenChange={openChange} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listId}
            disabled={disabled}
            {...field}
            className="flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
          >
            <span className={cn("min-w-0 flex-1 truncate [contain:inline-size]", !selected && "text-muted-foreground")}>
              {selected?.business.name ?? "Nadie"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 gap-0 p-0">
          <div className="flex items-center gap-2 border-b px-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              type="text"
              role="searchbox"
              aria-label="Buscar el negocio que lo recomendó"
              aria-controls={listId}
              aria-activedescendant={results[activeIndex] ? optionId(activeIndex) : undefined}
              placeholder="Nombre, enlace o código…"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          {businesses.isPending ? (
            <p className="p-3 text-center text-sm text-muted-foreground">Cargando negocios…</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-center text-sm text-muted-foreground">
              {options.length === 0 ? "Todavía no hay otros negocios." : `Ningún negocio coincide con «${query.trim()}».`}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Negocios" className="max-h-64 overflow-y-auto p-1">
              {results.map((summary, index) => {
                const isSelected = summary.business.id === value;
                return (
                  <li
                    key={summary.business.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    // mousedown no roba el foco al buscador; el clic elige el negocio.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
                    onClick={() => select(summary)}
                    className={cn(
                      "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5",
                      index === activeIndex && "bg-accent text-accent-foreground",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{summary.business.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        /book/{summary.business.slug}
                        {summary.referralCode && ` · Código ${summary.referralCode}`}
                      </span>
                    </span>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                  </li>
                );
              })}
            </ul>
          )}
        </PopoverContent>
      </Popover>
      {selected && !disabled && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Quitar «Recomendado por»"
          title="Quitar"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
