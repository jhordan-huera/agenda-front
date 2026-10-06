import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Professional } from "@/types";

/** Punto con el color de la agenda (calendario, listas, selectores). */
export function ProfessionalDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: color }} />;
}

export const ALL_AGENDAS = "all";

interface ProfessionalSelectProps {
  professionals: Pick<Professional, "id" | "displayName" | "color" | "title">[];
  value: string;
  onValueChange: (value: string) => void;
  /** Agrega la opción "Todos los profesionales" (valor ALL_AGENDAS). */
  allLabel?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
}

/** Selector de agenda: nombre, especialidad y su color. */
export function ProfessionalSelect({
  professionals,
  value,
  onValueChange,
  allLabel,
  id,
  className,
  disabled,
  ...props
}: ProfessionalSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={props["aria-label"]} className={cn("w-full", className)}>
        <SelectValue placeholder="Elige el profesional" />
      </SelectTrigger>
      <SelectContent position="popper">
        {allLabel && <SelectItem value={ALL_AGENDAS}>{allLabel}</SelectItem>}
        {professionals.map((professional) => (
          <SelectItem key={professional.id} value={professional.id}>
            <span className="flex items-center gap-2">
              <ProfessionalDot color={professional.color} />
              <span className="truncate">{professional.displayName}</span>
              {professional.title && <span className="truncate text-muted-foreground">· {professional.title}</span>}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
