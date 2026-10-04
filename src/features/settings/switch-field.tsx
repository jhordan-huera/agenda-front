import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SwitchFieldProps {
  label: string;
  description: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Contenido extra que aparece debajo (p. ej. opciones que dependen del switch). */
  children?: ReactNode;
}

/** Fila con etiqueta, explicación e interruptor, enlazados de forma accesible. */
export function SwitchField({ label, description, checked, onCheckedChange, disabled, children }: SwitchFieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <Label htmlFor={id}>{label}</Label>
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        <Switch
          id={id}
          aria-describedby={descriptionId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="mt-0.5"
        />
      </div>
      {children && <div className="mt-3 border-t pt-3">{children}</div>}
    </div>
  );
}
