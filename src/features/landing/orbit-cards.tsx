import { Bell, CalendarPlus, Check, MessageCircle, Receipt, Users } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Chip, Row } from "./orbit-card-parts";
import { CARD_META as META, CARD_TITLE as TITLE } from "./orbit-card-styles";

/*
 * Las tarjetas que flotan en la órbita de la portada: trozos de Agenda360 con datos de ejemplo (la portada lo
 * dice abajo, «Ilustración · datos de ejemplo»). Van ocultas para los lectores de pantalla: son decoración.
 */

/** Cada tarjeta: su ancho (px) y su contenido. */
export const ORBIT_CARDS: { width: number; content: ReactNode }[] = [
  {
    width: 176,
    content: (
      <>
        <p className={TITLE}>10:00 · Consulta</p>
        <p className={META}>Ana T. · 50 min</p>
        <div className="mt-2">
          <Chip tone="brand">Confirmada</Chip>
        </div>
      </>
    ),
  },
  {
    width: 196,
    content: (
      <>
        <p className={META}>Recordatorio · mañana 09:30</p>
        <p className={cn(TITLE, "mt-1")}>Te esperamos en tu cita</p>
        <span className="mt-2 inline-flex rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold text-background">Confirmo que voy</span>
      </>
    ),
  },
  { width: 178, content: <Row icon={<Bell className="size-3.5" />} title="Nueva reserva online" meta="Sofía R. · jueves 11:30" /> },
  {
    width: 148,
    content: (
      <>
        <p className={cn(TITLE, "mb-1.5")}>Octubre</p>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 21 }, (_, day) => (
            <span
              key={day}
              className={cn("aspect-square rounded-[3px]", [2, 5, 6, 9, 12, 13, 16, 19].includes(day) ? "bg-ink/70" : "bg-muted")}
            />
          ))}
        </div>
      </>
    ),
  },
  { width: 176, content: <Row icon={<Receipt className="size-3.5" />} title="Comprobante recibido" meta="$35,00 · transferencia" /> },
  { width: 196, content: <Row icon={<CalendarPlus className="size-3.5" />} title="En tu calendario" meta="Google · iPhone · Outlook" /> },
  {
    width: 200,
    content: (
      <div className="grid grid-cols-3 gap-1.5">
        {["Por confirmar", "Confirmadas", "Pagadas"].map((column, index) => (
          <div key={column} className="rounded-md bg-muted/70 p-1">
            <p className="truncate text-[9px] font-semibold text-muted-foreground">{column}</p>
            {Array.from({ length: 3 - index }, (_, card) => (
              <span key={card} className="mt-1 block h-2.5 rounded-sm bg-card" />
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    width: 160,
    content: (
      <>
        <p className={META}>PHQ-9</p>
        <p className={TITLE}>7 / 27 · Leve</p>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-[26%] rounded-full bg-ink" />
        </span>
      </>
    ),
  },
  { width: 196, content: <Row icon={<MessageCircle className="size-3.5" />} title="Mensaje listo para WhatsApp" meta="Hola Ana, tu cita es el jueves…" /> },
  {
    width: 172,
    content: (
      <>
        <p className={cn(TITLE, "flex items-center gap-1")}>
          <Check className="size-3.5 text-confirmed" /> Confirmó que va
        </p>
        <p className={META}>Luis M. · viernes 16:00</p>
      </>
    ),
  },
  {
    width: 160,
    content: (
      <>
        <p className={cn(TITLE, "mb-1.5")}>Horas libres</p>
        <div className="grid grid-cols-3 gap-1">
          {["09:00", "09:50", "10:40", "11:30", "15:00", "15:50"].map((time, index) => (
            <span
              key={time}
              className={cn("rounded-[4px] border py-0.5 text-center text-[9px] font-semibold", index === 3 ? "border-ink bg-ink text-primary-foreground" : "border-border")}
            >
              {time}
            </span>
          ))}
        </div>
      </>
    ),
  },
  { width: 168, content: <Row icon={<Users className="size-3.5" />} title="Tres agendas" meta="Cada una con su color" /> },
];
