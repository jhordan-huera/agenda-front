import { CalendarCheck, Check, MousePointer2, Paperclip, Stamp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Las ocho ilustraciones de las funciones (prueba en dev, 2026-10-27): trozos de Agenda360 con datos de
 * ejemplo que se mueven en bucle, como los vídeos de getartcraft.com, pero en HTML y CSS. Sólo corren
 * mientras su casilla se ve (data-playing, landing-motion.ts); las clases lv-a-* dicen en qué momento del
 * bucle entra cada pieza (landing.css). Con «reducir movimiento», quedan en su estado final.
 */

const WINDOW = "relative w-full max-w-sm rounded-xl border border-border bg-card p-4 text-xs text-card-foreground shadow-lifted";
const LABEL = "font-tech text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase";
const TITLE = "text-sm font-semibold text-foreground";

function Badge({ children, className, tone = "brand" }: { children: ReactNode; className?: string; tone?: "brand" | "confirmed" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "brand" ? "bg-ink text-primary-foreground" : "bg-confirmed/15 text-confirmed",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** 01 · La página de reservas: se elige una hora libre y queda reservada. */
export function BookingVisual() {
  const times = ["09:00", "09:50", "10:40", "11:30", "15:00", "15:50"];
  return (
    <div className={WINDOW}>
      <p className={TITLE}>Consulta psicológica</p>
      <p className="text-muted-foreground">50 min · jueves 30</p>
      <p className={cn(LABEL, "mt-4 mb-2")}>Elige una hora</p>
      <div className="grid grid-cols-3 gap-2">
        {times.map((time) => (
          <span key={time} className={cn("relative rounded-md border border-border py-2 text-center font-semibold", time === "11:30" && "lv-a-pick")}>
            {time}
            {time === "11:30" && (
              <MousePointer2
                className="lv-a-cursor absolute -right-3 -bottom-3 size-4 fill-foreground text-foreground"
                style={{ "--lv-cx0": "160%", "--lv-cy0": "140%" } as CSSProperties}
              />
            )}
          </span>
        ))}
      </div>
      <div className="lv-a-in55 mt-4">
        <Badge>
          <Check className="size-3.5" /> Reservada · jueves 11:30
        </Badge>
      </div>
    </div>
  );
}

/** 02 · El recordatorio: llega solo y el paciente pulsa «Confirmo que voy». */
export function ReminderVisual() {
  return (
    <div className={WINDOW}>
      <div>
        <p className={LABEL}>Para: Ana T.</p>
        <p className={cn(TITLE, "mt-2")}>Recordatorio de tu cita</p>
        <p className="mt-1 text-muted-foreground">Mañana, viernes 31, a las 10:00.</p>
        <span className="lv-a-press mt-3 inline-flex rounded-md bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background">Confirmo que voy</span>
      </div>
      <div className="lv-a-in55 mt-4 border-t border-border pt-3">
        <Badge tone="confirmed">
          <Check className="size-3.5" /> Confirmó que va
        </Badge>
      </div>
    </div>
  );
}

const BOARD_COLUMNS = ["Por confirmar", "Confirmadas", "Atendidas", "Pagadas"];

/** 03 · El tablero: la misma cita pasa de columna en columna, de la reserva al cobro. */
export function BoardVisual() {
  return (
    <div className={cn(WINDOW, "max-w-md")} style={{ "--lv-gap": "0.5rem" } as CSSProperties}>
      <div className="relative grid grid-cols-4 gap-2">
        {BOARD_COLUMNS.map((column) => (
          <div key={column} className="min-h-28 rounded-md bg-muted/60 p-1.5">
            <p className="truncate text-[10px] font-semibold text-muted-foreground">{column}</p>
          </div>
        ))}
        <div className="lv-a-board absolute top-7 left-0 w-[calc((100%-1.5rem)/4)] px-1.5">
          <div className="rounded-md border border-ink/60 bg-card p-1.5 shadow-sm">
            <p className="truncate text-[10px] font-semibold">10:00 · Ana T.</p>
            <p className="truncate text-[9px] text-muted-foreground">Consulta</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Las citas de la semana: día (0–4), fila de inicio y de fin (de 6) y su momento de entrada (0–1). */
const WEEK_BLOCKS = [
  { day: 0, from: 1, to: 3, at: 0 },
  { day: 1, from: 0, to: 2, at: 0.15 },
  { day: 2, from: 3, to: 5, at: 0.3 },
  { day: 3, from: 1, to: 2, at: 0.45 },
  { day: 1, from: 4, to: 6, at: 0.6 },
  { day: 4, from: 2, to: 4, at: 0.75 },
  { day: 3, from: 4, to: 6, at: 0.9 },
];

/** 04 · La agenda: la semana se va llenando de citas. */
export function WeekVisual() {
  return (
    <div className={cn(WINDOW, "max-w-md")}>
      <div className="grid grid-cols-5 gap-1.5">
        {["Lun", "Mar", "Mié", "Jue", "Vie"].map((day) => (
          <p key={day} className={cn(LABEL, "text-center")}>
            {day}
          </p>
        ))}
      </div>
      <div className="relative mt-2 grid h-36 grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }, (_, day) => (
          <div key={day} className="rounded-md bg-muted/50" />
        ))}
        {WEEK_BLOCKS.map((block, index) => (
          <span
            key={index}
            className={cn(
              "lv-week-block absolute rounded-md px-1 py-0.5 text-[9px] font-semibold",
              index % 3 === 0 ? "bg-ink text-primary-foreground" : "bg-highlight text-highlight-foreground",
            )}
            style={
              {
                left: `calc(${block.day} * (100% + 0.375rem) / 5)`,
                width: "calc((100% - 1.5rem) / 5)",
                top: `${(block.from / 6) * 100}%`,
                height: `${((block.to - block.from) / 6) * 100}%`,
                "--lv-at": block.at,
              } as CSSProperties
            }
          >
            {`${9 + block.from}:00`}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 05 · La historia clínica: la evolución con su escala, que se califica sola. */
export function ClinicalVisual() {
  return (
    <div className={WINDOW}>
      <p className={LABEL}>Evolución · sesión 4</p>
      <div className="mt-3 space-y-1.5">
        {["w-11/12", "w-4/5", "w-2/3"].map((width) => (
          <span key={width} className={cn("block h-2 rounded-full bg-muted", width)} />
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-border p-3">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">PHQ-9</p>
          <p className="lv-a-in55 font-semibold tabular-nums">7 / 27 · Leve</p>
        </div>
        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-muted">
          <span className="lv-a-fill block h-full rounded-full bg-ink" style={{ "--lv-fill": 0.26 } as CSSProperties} />
        </span>
      </div>
    </div>
  );
}

/** 06 · El cobro por transferencia: llega el comprobante y la cita queda pagada. */
export function PaymentVisual() {
  return (
    <div className={WINDOW}>
      <p className={LABEL}>Tus datos para la transferencia</p>
      <p className={cn(TITLE, "mt-2")}>Banco de ejemplo</p>
      <p className="text-muted-foreground">Cuenta de ahorros ····1234</p>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border p-2.5">
        <Paperclip className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">comprobante.jpg</p>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
            <span className="lv-a-fill block h-full rounded-full bg-ink" />
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="confirmed" className="lv-a-in55">
          <Check className="size-3.5" /> Comprobante recibido
        </Badge>
        <Badge className="lv-a-in75">
          <Stamp className="size-3.5" /> Pagada
        </Badge>
      </div>
    </div>
  );
}

/** 07 · El calendario del celular: la cita llega como invitación y se añade sola. */
export function CalendarVisual() {
  return (
    <div className={WINDOW}>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-ink">
          <CalendarCheck className="size-4" />
        </span>
        <div className="min-w-0">
          <p className={TITLE}>Invitación: Consulta · Ana T.</p>
          <p className="text-muted-foreground">Jueves 30 · 10:00 a 10:50</p>
          <p className={cn(LABEL, "mt-2")}>Google · iPhone · Outlook</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[2.5rem_1fr] gap-x-2 text-[10px] text-muted-foreground">
        {["09:00", "10:00", "11:00"].map((hour) => (
          <div key={hour} className="contents">
            <span className="tabular-nums">{hour}</span>
            <span className="relative h-7 border-t border-border">
              {hour === "10:00" && (
                <span className="lv-a-in55 absolute inset-x-0 top-0.5 rounded-md bg-ink px-2 py-1 font-semibold text-primary-foreground">
                  Consulta · Ana T.
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 08 · Varias agendas: cada persona del equipo con su rol y su color. */
export function TeamVisual() {
  const people = [
    { initials: "MC", name: "María C.", role: "Administradora", color: "bg-ink", step: "" },
    { initials: "JP", name: "Jorge P.", role: "Profesional", color: "bg-highlight", step: "lv-a-in30" },
    { initials: "LR", name: "Lucía R.", role: "Recepción", color: "bg-muted-foreground", step: "lv-a-in55" },
  ];
  return (
    <div className={cn(WINDOW, "space-y-2.5")}>
      {people.map((person) => (
        <div key={person.initials} className={cn(person.step, "flex items-center gap-3 rounded-lg border border-border p-2.5")}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-ink">{person.initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{person.name}</span>
            <span className="block truncate text-muted-foreground">{person.role}</span>
          </span>
          <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", person.color)} />
        </div>
      ))}
    </div>
  );
}
