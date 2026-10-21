import {
  ArrowUpDown,
  Bell,
  BellRing,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  KeyRound,
  MoonStar,
  Receipt,
  ShieldAlert,
  Store,
  Sunrise,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useMarkNoticeRead, type NoticeScope } from "@/hooks/queries/use-notices";
import { isPanelPath } from "@/lib/auth/next-path";
import { cn } from "@/lib/utils";
import type { NoticeKind, PanelNotice } from "@/types";

const ICONS: Record<NoticeKind, LucideIcon> = {
  booking: CalendarPlus,
  receipt: Receipt,
  patient_confirm: CalendarCheck,
  patient_cancel: CalendarX,
  new_appointment: CalendarPlus,
  unclosed: CalendarClock,
  evening_summary: MoonStar,
  morning_summary: Sunrise,
  new_business: Store,
  plan_request: ArrowUpDown,
  account_security: ShieldAlert,
  login_attack: KeyRound,
  reminders_sent: BellRing,
  billing_receipt: WalletCards,
};

interface NoticeItemProps {
  notice: PanelNotice;
  scope: NoticeScope;
  /** «hace 5 min», «ayer»… (o la hora, en la página «Avisos»). */
  time: string;
  /** Al tocarlo (p. ej. cerrar la lista de la campana). */
  onOpen?: () => void;
}

/**
 * Un aviso de la campana: título, texto (con el nombre completo del paciente) y hace cuánto. Los no
 * leídos van resaltados, con un punto. Al tocarlo queda leído y se abre lo suyo (la cita en la agenda,
 * la agenda del día, la lista «Por cerrar» o la pantalla de /admin).
 */
export function NoticeItem({ notice, scope, time, onOpen }: NoticeItemProps) {
  const navigate = useNavigate();
  const markRead = useMarkNoticeRead(scope);
  const Icon = ICONS[notice.kind] ?? Bell;

  const open = () => {
    if (!notice.read) markRead.mutate(notice.id);
    onOpen?.();
    // Sólo rutas propias del panel o de /admin (la API las arma, pero no se confía en ello).
    if (isPanelPath(notice.url)) void navigate(notice.url);
  };

  return (
    <li>
      <button
        type="button"
        onClick={open}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          // Lo nuevo, en el lila suave de la marca (como la reserva que entra).
          !notice.read && "bg-secondary/70 hover:bg-secondary",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            notice.read ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn("min-w-0 text-sm text-foreground", notice.read ? "font-medium" : "font-semibold")}>{notice.title}</span>
            <time dateTime={notice.createdAt} className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
              {time}
            </time>
          </span>
          <span className="mt-0.5 block text-[0.8125rem] leading-snug break-words text-muted-foreground">{notice.body}</span>
        </span>
        {!notice.read && (
          <>
            <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
            <span className="sr-only">(sin leer)</span>
          </>
        )}
      </button>
    </li>
  );
}
