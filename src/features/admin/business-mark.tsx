import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** El logo del negocio o, sin logo, sus iniciales (tarjetas y ficha del panel de plataforma). */
export function BusinessMark({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-sm font-bold text-ink",
        className,
        // El logo entero sobre una placa blanca, también en el oscuro: un logo ancho no se recorta y uno
        // oscuro con fondo transparente no se pierde (spec 019).
        logoUrl && "border bg-white p-1 dark:bg-white",
      )}
      aria-hidden
    >
      {logoUrl ? <img src={logoUrl} alt="" className="size-full rounded-md object-contain" /> : getInitials(name)}
    </span>
  );
}
