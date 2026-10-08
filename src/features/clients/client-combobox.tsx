import { Check, ChevronDown, Search, UserPlus } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import type { FieldControlProps } from "@/components/shared/form-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Client } from "@/types";

interface ClientComboboxProps extends Partial<FieldControlProps> {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  /** Si se indica, ofrece crear un cliente con lo escrito cuando no hay resultados. */
  onCreate?: (name: string) => void;
  className?: string;
}

/** Selector de cliente con búsqueda por nombre, email o teléfono (teclado: ↑ ↓ Enter). */
export function ClientCombobox({ clients, value, onChange, onCreate, className, ...field }: ClientComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = clients.find((client) => client.id === value);
  const term = normalizeSearch(query.trim());
  const results = term
    ? clients.filter((client) =>
        [client.name, client.documentId, client.email, client.phone].some((v) => normalizeSearch(v).includes(term)),
      )
    : clients;
  const optionId = (index: number) => `${listId}-option-${index}`;

  const openChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      // Al abrir, se resalta el cliente ya elegido.
      setActiveIndex(Math.max(0, clients.findIndex((client) => client.id === value)));
    }
  };

  const select = (client: Client) => {
    onChange(client.id);
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
      // Enter elige el cliente resaltado y nunca envía el formulario de la cita.
      event.preventDefault();
      const client = results[activeIndex];
      if (client) select(client);
      else if (onCreate && query.trim()) {
        setOpen(false);
        onCreate(query.trim());
      }
    }
  };

  return (
    // `modal`: dentro de un diálogo, permite desplazar la lista con la rueda del ratón.
    <Popover open={open} onOpenChange={openChange} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          {...field}
          className={cn(
            "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30",
            className,
          )}
        >
          {/* contain: inline-size: un nombre largo se corta con "…" sin ensanchar el formulario. */}
          <span className={cn("min-w-0 flex-1 truncate [contain:inline-size]", !selected && "text-muted-foreground")}>
            {selected?.name ?? "Selecciona un cliente"}
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
            aria-label="Buscar cliente"
            aria-controls={listId}
            aria-activedescendant={results[activeIndex] ? optionId(activeIndex) : undefined}
            placeholder="Buscar por nombre, email o teléfono…"
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        {results.length === 0 ? (
          <div className="grid gap-2 p-3 text-center text-sm">
            <p className="text-muted-foreground">
              {clients.length === 0 ? "Aún no tienes clientes." : `Ningún cliente coincide con «${query.trim()}».`}
            </p>
            {onCreate && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCreate(query.trim());
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-medium text-primary outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <UserPlus className="size-4" aria-hidden />
                {query.trim() ? `Crear cliente «${query.trim()}»` : "Crear cliente"}
              </button>
            )}
          </div>
        ) : (
          <ul id={listId} role="listbox" aria-label="Clientes" className="max-h-64 overflow-y-auto p-1">
            {results.map((client, index) => {
              const isSelected = client.id === value;
              return (
                <li
                  key={client.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  // mousedown no roba el foco al buscador; el clic elige el cliente.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
                  onClick={() => select(client)}
                  className={cn(
                    "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5",
                    index === activeIndex && "bg-accent text-accent-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{client.name}</span>
                    {(client.email || client.phone) && (
                      <span className="block truncate text-xs text-muted-foreground">{client.email || client.phone}</span>
                    )}
                  </span>
                  {isSelected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
