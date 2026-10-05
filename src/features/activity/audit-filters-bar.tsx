import { Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditEntityType } from "@/types";
import { AUDIT_TYPE_LABELS, EMPTY_AUDIT_FILTERS, type AuditFilterState } from "./audit-filters";

interface AuditFiltersBarProps {
  value: AuditFilterState;
  onChange: (next: AuditFilterState) => void;
  /** Tipos que se pueden elegir (sin ellos no se muestra el selector). */
  types?: AuditEntityType[];
  /** Personas que se pueden elegir. */
  people?: { value: string; label: string }[];
  /** Filtros propios de la vista (p. ej. el negocio en la del super admin). */
  children?: ReactNode;
}

/** Buscador, tipo, persona y rango de fechas de la auditoría. */
export function AuditFiltersBar({ value, onChange, types, people, children }: AuditFiltersBarProps) {
  const [search, setSearch] = useState(value.q);
  const set = (patch: Partial<AuditFilterState>) => onChange({ ...value, ...patch });

  // El buscador espera a que se deje de escribir para no pedir una página por cada letra.
  useEffect(() => {
    if (search === value.q) return;
    const timer = setTimeout(() => onChange({ ...value, q: search }), 350);
    return () => clearTimeout(timer);
  }, [search, value, onChange]);

  const filtered = search !== "" || JSON.stringify(value) !== JSON.stringify(EMPTY_AUDIT_FILTERS);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label="Buscar en la actividad"
          placeholder="Buscar cliente, servicio, persona…"
          className="pl-8"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {types && (
        <Select value={value.type} onValueChange={(type) => set({ type: type as AuditFilterState["type"] })}>
          <SelectTrigger aria-label="Tipo de actividad" className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Todo</SelectItem>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {AUDIT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {people && (
        <Select value={value.actor} onValueChange={(actor) => set({ actor })}>
          <SelectTrigger aria-label="Persona" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Todas las personas</SelectItem>
            {people.map((person) => (
              <SelectItem key={person.value} value={person.value}>
                {person.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {children}
      <label className="grid gap-1 text-xs text-muted-foreground">
        Desde
        <Input type="date" className="w-38" max={value.to || undefined} value={value.from} onChange={(e) => set({ from: e.target.value })} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Hasta
        <Input type="date" className="w-38" min={value.from || undefined} value={value.to} onChange={(e) => set({ to: e.target.value })} />
      </label>
      {filtered && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSearch("");
            onChange(EMPTY_AUDIT_FILTERS);
          }}
        >
          <X /> Limpiar
        </Button>
      )}
    </div>
  );
}
