import { CalendarCheck, Check, FileImage, Home, MapPin, Navigation, Paperclip, Stamp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Las ilustraciones de las funciones (spec 043): trozos de Agenda360 con datos de ejemplo, quietos y en su estado
 * final, hechos con piezas de la página (sin imágenes): se ven igual en claro y en oscuro y no pesan. Una sola gama:
 * lo hecho o confirmado en durazno, lo de la marca en tomate. Las usan la portada y las páginas por especialidad.
 */

const WINDOW = "relative w-full max-w-sm rounded-2xl bg-card p-4 text-xs text-card-foreground shadow-[0_18px_40px_-24px_rgb(28_25_23/0.35)] ring-1 ring-border";
const LABEL = "text-[0.6875rem] text-muted-foreground";
const TITLE = "text-sm font-semibold text-foreground";

function Badge({ children, className, tone = "brand" }: { children: ReactNode; className?: string; tone?: "brand" | "done" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "brand" ? "bg-ink text-primary-foreground" : "bg-highlight text-highlight-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Una barra de progreso quieta, llena hasta `value` (de 0 a 1). */
function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("block overflow-hidden rounded-full bg-muted", className)}>
      <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.round(value * 100)}%` } as CSSProperties} />
    </span>
  );
}

/**
 * La página de reservas: la hora elegida y la cita reservada. Las páginas por especialidad (spec 041) cambian el
 * servicio de ejemplo.
 */
export function BookingVisual({ service = "Consulta psicológica", detail = "50 min · jueves 30" }: { service?: string; detail?: string }) {
  const times = ["09:00", "09:50", "10:40", "11:30", "15:00", "15:50"];
  return (
    <div className={WINDOW}>
      <p className={TITLE}>{service}</p>
      <p className="text-muted-foreground">{detail}</p>
      <p className={cn(LABEL, "mt-4 mb-2")}>Elige una hora</p>
      <div className="grid grid-cols-3 gap-2">
        {times.map((time) => (
          <span
            key={time}
            className={cn(
              "rounded-lg py-2 text-center font-semibold ring-1 ring-border ring-inset",
              time === "11:30" && "bg-ink text-primary-foreground ring-0",
            )}
          >
            {time}
          </span>
        ))}
      </div>
      <div className="mt-4">
        <Badge tone="done">
          <Check className="size-3.5" /> Reservada: jueves 11:30
        </Badge>
      </div>
    </div>
  );
}

/** El recordatorio: llega solo y el paciente pulsa «Confirmo que voy». */
export function ReminderVisual() {
  return (
    <div className={WINDOW}>
      <p className={LABEL}>Para Ana T.</p>
      <p className={cn(TITLE, "mt-1.5")}>Recordatorio de tu cita</p>
      <p className="mt-1 text-muted-foreground">Mañana, viernes 31, a las 10:00.</p>
      <span className="mt-3 inline-flex rounded-lg bg-ink px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">Confirmo que voy</span>
      <div className="mt-4 border-t border-border pt-3">
        <Badge tone="done">
          <Check className="size-3.5" /> Confirmó que va
        </Badge>
      </div>
    </div>
  );
}

/** El tablero: cada cita en su columna, de la reserva al cobro. */
export function BoardVisual() {
  const columns = [
    { title: "Por confirmar", card: "Luis R." },
    { title: "Confirmadas", card: "Ana T.", current: true },
    { title: "Atendidas", card: "María P." },
    { title: "Pagadas", card: "Jorge V." },
  ];
  return (
    <div className={cn(WINDOW, "max-w-md")}>
      <div className="grid grid-cols-4 gap-2">
        {columns.map((column) => (
          <div key={column.title} className="min-h-28 rounded-lg bg-muted/60 p-1.5">
            <p className="truncate text-[10px] font-semibold text-muted-foreground">{column.title}</p>
            <div className={cn("mt-1.5 rounded-md bg-card p-1.5 ring-1 ring-border", column.current && "ring-2 ring-ink")}>
              <p className="truncate text-[10px] font-semibold">{column.card}</p>
              <p className="truncate text-[9px] text-muted-foreground">Consulta</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Las citas de la semana: día (0–4) y fila de inicio y de fin (de 6). */
const WEEK_BLOCKS = [
  { day: 0, from: 1, to: 3 },
  { day: 1, from: 0, to: 2 },
  { day: 2, from: 3, to: 5 },
  { day: 3, from: 1, to: 2 },
  { day: 1, from: 4, to: 6 },
  { day: 4, from: 2, to: 4 },
  { day: 3, from: 4, to: 6 },
];

/** La agenda: la semana con sus citas. */
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
              "absolute rounded-md px-1 py-0.5 text-[9px] font-semibold",
              index % 3 === 0 ? "bg-ink text-primary-foreground" : "bg-highlight text-highlight-foreground",
            )}
            style={
              {
                left: `calc(${block.day} * (100% + 0.375rem) / 5)`,
                width: "calc((100% - 1.5rem) / 5)",
                top: `${(block.from / 6) * 100}%`,
                height: `${((block.to - block.from) / 6) * 100}%`,
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

/** La historia clínica: la evolución con su escala, que se califica sola. */
export function ClinicalVisual() {
  return (
    <div className={WINDOW}>
      <p className={LABEL}>Evolución de la sesión 4</p>
      <div className="mt-3 space-y-1.5">
        {["w-11/12", "w-4/5", "w-2/3"].map((width) => (
          <span key={width} className={cn("block h-2 rounded-full bg-muted", width)} />
        ))}
      </div>
      <div className="mt-4 rounded-xl p-3 ring-1 ring-border">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">PHQ-9</p>
          <p className="font-semibold tabular-nums">7 de 27, leve</p>
        </div>
        <Bar value={0.26} className="mt-2 h-2" />
      </div>
    </div>
  );
}

/** El cobro por transferencia: llega el comprobante y la cita queda pagada. */
export function PaymentVisual() {
  return (
    <div className={WINDOW}>
      <p className={LABEL}>Tus datos para la transferencia</p>
      <p className={cn(TITLE, "mt-1.5")}>Banco de ejemplo</p>
      <p className="text-muted-foreground">Cuenta de ahorros ····1234</p>
      <div className="mt-4 flex items-center gap-2 rounded-xl p-2.5 ring-1 ring-border">
        <Paperclip className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">comprobante.jpg</p>
          <Bar value={1} className="mt-1.5 h-1.5" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="done">
          <Check className="size-3.5" /> Comprobante recibido
        </Badge>
        <Badge>
          <Stamp className="size-3.5" /> Pagada
        </Badge>
      </div>
    </div>
  );
}

/** El calendario del celular: la cita llega como invitación y se añade sola. */
export function CalendarVisual() {
  return (
    <div className={WINDOW}>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-highlight text-highlight-foreground">
          <CalendarCheck className="size-4" />
        </span>
        <div className="min-w-0">
          <p className={TITLE}>Invitación: consulta con Ana T.</p>
          <p className="text-muted-foreground">Jueves 30, de 10:00 a 10:50</p>
          <p className={cn(LABEL, "mt-1.5")}>Para Google, iPhone u Outlook</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[2.5rem_1fr] gap-x-2 text-[10px] text-muted-foreground">
        {["09:00", "10:00", "11:00"].map((hour) => (
          <div key={hour} className="contents">
            <span className="tabular-nums">{hour}</span>
            <span className="relative h-7 border-t border-border">
              {hour === "10:00" && (
                <span className="absolute inset-x-0 top-0.5 rounded-md bg-ink px-2 py-1 font-semibold text-primary-foreground">Consulta con Ana T.</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Varias agendas: cada persona del equipo con su rol. */
export function TeamVisual() {
  const people = [
    { initials: "MC", name: "María C.", role: "Administradora" },
    { initials: "JP", name: "Jorge P.", role: "Profesional" },
    { initials: "LR", name: "Lucía R.", role: "Recepción" },
  ];
  return (
    <div className={cn(WINDOW, "space-y-2.5")}>
      {people.map((person) => (
        <div key={person.initials} className="flex items-center gap-3 rounded-xl p-2.5 ring-1 ring-border">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-highlight text-[11px] font-bold text-highlight-foreground">
            {person.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{person.name}</span>
            <span className="block truncate text-muted-foreground">{person.role}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Páginas por especialidad (spec 041): la historia clínica con archivos, la evolución de la sesión y un adjunto
 * (una radiografía, un examen) guardado en su historia.
 */
export function ClinicalFilesVisual({ title, file }: { title: string; file: string }) {
  return (
    <div className={WINDOW}>
      <p className={LABEL}>{title}</p>
      <div className="mt-3 space-y-1.5">
        {["w-11/12", "w-4/5", "w-2/3"].map((width) => (
          <span key={width} className={cn("block h-2 rounded-full bg-muted", width)} />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl p-2.5 ring-1 ring-border">
        <FileImage className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{file}</p>
          <Bar value={1} className="mt-1.5 h-1.5" />
        </div>
      </div>
      <div className="mt-3">
        <Badge tone="done">
          <Check className="size-3.5" /> Guardado en su historia
        </Badge>
      </div>
    </div>
  );
}

/**
 * Páginas por especialidad (spec 041): la visita a domicilio, con la dirección que marcó el paciente al reservar,
 * un plano de ejemplo y «Cómo llegar».
 */
export function HomeVisitVisual() {
  return (
    <div className={WINDOW}>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-highlight text-highlight-foreground">
          <Home className="size-4" />
        </span>
        <div className="min-w-0">
          <p className={TITLE}>Fisioterapia a domicilio</p>
          <p className="text-muted-foreground">Ana T., jueves 30, 16:00</p>
          <p className="mt-1 truncate text-muted-foreground">Av. de Ejemplo N12-34</p>
        </div>
      </div>
      <div aria-hidden className="relative mt-4 h-20 overflow-hidden rounded-xl bg-muted">
        <span className="absolute inset-x-0 top-1/3 h-px bg-border" />
        <span className="absolute inset-x-0 top-2/3 h-px bg-border" />
        <span className="absolute inset-y-0 left-1/4 w-px bg-border" />
        <span className="absolute inset-y-0 left-2/3 w-px bg-border" />
        <MapPin className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-full fill-ink text-ink" />
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
        <Navigation className="size-3" /> Cómo llegar
      </span>
    </div>
  );
}
