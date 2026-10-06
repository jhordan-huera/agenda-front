import { Users } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { PublicProfessional } from "@/types";

/** "El primero disponible": la cita va a quien tenga libre la hora elegida. */
export const ANY_PROFESSIONAL = "any";

interface ProfessionalStepProps {
  professionals: PublicProfessional[];
  /** Id elegido, ANY_PROFESSIONAL o null (aún nada). */
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const OPTION =
  "flex w-full items-center gap-4 bg-background px-4 py-4 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:px-5";

/** Con varias agendas: con quién quiere atenderse el paciente. */
export function ProfessionalStep({ professionals, selectedId, onSelect }: ProfessionalStepProps) {
  return (
    <div role="radiogroup" aria-label="Profesionales" className="divide-y overflow-hidden rounded-xl border">
      <button
        type="button"
        role="radio"
        aria-checked={selectedId === ANY_PROFESSIONAL}
        onClick={() => onSelect(ANY_PROFESSIONAL)}
        className={cn(OPTION, selectedId === ANY_PROFESSIONAL && "bg-accent hover:bg-accent")}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
          <Users className="size-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-lg font-bold">El primero disponible</span>
          <span className="block text-muted-foreground">Verás todas las horas libres y te atiende quien tenga la que elijas.</span>
        </span>
      </button>
      {professionals.map((professional) => {
        const selected = professional.id === selectedId;
        return (
          <button
            key={professional.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(professional.id)}
            className={cn(OPTION, selected && "bg-accent hover:bg-accent")}
          >
            <UserAvatar name={professional.displayName} src={professional.avatarUrl} />
            <span className="min-w-0">
              <span className="block text-lg font-bold">{professional.displayName}</span>
              {professional.title && <span className="block text-muted-foreground">{professional.title}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
