import { HeroAgenda } from "./hero-agenda";
import { PhoneBooking } from "./phone-booking";
import { SectionHeading } from "./section-heading";

/** Cifras de muestra del panel (se dice que son de ejemplo). */
const SAMPLE_KPIS = [
  { label: "Citas esta semana", value: "29", trend: "+12 %" },
  { label: "Por confirmar", value: "4" },
  { label: "Ingresos del mes", value: "$2,915", trend: "+8 %" },
  { label: "Asistencia", value: "86 %" },
];

/**
 * Así se ve el panel: una tarjeta grande con las cifras de la semana y, debajo, el día del profesional
 * (con la reserva que entra) y la página de reservas en el celular de su cliente. Datos de ejemplo.
 */
export function PanelPreviewSection() {
  return (
    <section id="tu-panel" className="scroll-mt-28 pt-20 pb-6 sm:pt-28 sm:pb-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Tu panel"
          title="Todo tu consultorio"
          highlight="en una pantalla"
          description="Tu agenda, tus clientes y lo que ganas en el mes, en el celular o en la computadora."
        />
        <figure className="mt-14 rounded-3xl border border-border/70 bg-card p-4 shadow-[0_28px_60px_-34px_rgb(29_36_51/0.35)] sm:p-6">
          <figcaption className="flex flex-wrap items-start justify-between gap-3">
            <span>
              <span className="block text-lg font-bold">Resumen de la semana</span>
              <span className="block text-sm text-muted-foreground">Datos de ejemplo</span>
            </span>
            <span aria-hidden className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground">
              Nueva cita
            </span>
          </figcaption>
          <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SAMPLE_KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-muted p-4">
                <dt className="text-sm text-muted-foreground">{kpi.label}</dt>
                <dd className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-[-0.02em] tabular-nums">{kpi.value}</span>
                  {kpi.trend && <span className="text-xs font-semibold text-emerald-600">{kpi.trend}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
            <div className="flex items-center justify-center rounded-2xl bg-muted px-3 pt-6 pb-12 sm:px-10 sm:pt-8 sm:pb-14">
              <div className="w-full max-w-lg">
                <HeroAgenda />
              </div>
            </div>
            <div className="flex items-center justify-center rounded-2xl bg-muted px-4 py-8">
              <PhoneBooking />
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
