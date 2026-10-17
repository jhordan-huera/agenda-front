import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** El logo del negocio o, sin logo, sus iniciales (tarjetas y ficha del panel de plataforma). */
export function BusinessMark({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-sm font-bold text-ink",
        className,
        // En el oscuro, el logo va sobre su placa clara: uno oscuro con fondo transparente no se perdería (spec 019).
        logoUrl && "dark:bg-white dark:p-1",
      )}
      aria-hidden
    >
      {logoUrl ? <img src={logoUrl} alt="" className="size-full object-cover dark:rounded-md" /> : getInitials(name)}
    </span>
  );
}
