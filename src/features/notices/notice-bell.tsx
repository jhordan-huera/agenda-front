import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUnreadNotices, type NoticeScope } from "@/hooks/queries/use-notices";
import { cn } from "@/lib/utils";
import { NoticeList } from "./notice-list";

/** «9+» con más de 9. */
const unreadBadge = (unread: number) => (unread > 9 ? "9+" : String(unread));

/** «Avisos, 3 sin leer» para el lector de pantalla («Avisos» sin ninguno). */
const bellLabel = (unread: number) => (unread > 0 ? `Avisos, ${unread} sin leer` : "Avisos");

interface NoticeBellProps {
  scope: NoticeScope;
  /** La zona del negocio (en /admin, la de la plataforma). */
  timezone: string;
  /** Hacia dónde se abre la lista: desde el menú lateral, hacia la derecha; desde la barra del celular, hacia la izquierda. */
  align?: "start" | "end";
  className?: string;
}

/**
 * La campana del panel (spec 014): el número de avisos sin leer y, al tocarla, los últimos 20. Va en el
 * menú lateral (computadora) y en la barra de arriba (celular). Si la API todavía no tiene la campana
 * (404) o no es para esta cuenta, no se muestra.
 */
export function NoticeBell({ scope, timezone, align = "end", className }: NoticeBellProps) {
  const { unread, hidden } = useUnreadNotices(scope);
  const [open, setOpen] = useState(false);
  if (hidden) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={bellLabel(unread)} className={cn("relative shrink-0 rounded-xl", className)}>
          <Bell className="size-[1.15rem]" aria-hidden />
          {unread > 0 && (
            // La cifra, blanca sobre el rojo en el claro; en el oscuro el rojo se aclara y va oscura (spec 019).
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[0.6875rem] leading-none font-semibold text-white tabular-nums ring-2 ring-background dark:text-background"
            >
              {unreadBadge(unread)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Avisos"
        align={align}
        sideOffset={8}
        collisionPadding={16}
        // En el celular ocupa el ancho de la pantalla menos los márgenes (16 px a cada lado).
        className="w-[min(24rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl p-0"
      >
        <NoticeList scope={scope} timezone={timezone} unread={unread} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
