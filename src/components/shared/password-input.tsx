import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type"> & {
  /** Icono decorativo a la izquierda (p. ej. un candado). Sin él, el campo se ve como siempre. */
  icon?: ReactNode;
};

export function PasswordInput({ icon, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {icon && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted-foreground [&_svg]:size-4"
        >
          {icon}
        </span>
      )}
      <Input type={visible ? "text" : "password"} className={cn("h-10 pr-10", icon && "pl-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
