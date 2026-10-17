import { CalendarChips } from "@/features/landing/floating-chip";
import { HeroCalendar } from "@/features/landing/hero-calendar";
import { PRODUCT_FACTS } from "@/features/landing/product-facts";

/**
 * El panel de las pantallas de acceso (sólo en escritorio): en el degradado de la marca, el mensaje
 * de la portada y su calendario de ejemplo con las etiquetas de lo que pasa solo. Cabe entero en
 * ventanas bajas (unos 700 px); los datos de abajo sólo aparecen si hay altura.
 * Los textos van en el color del texto del degradado, puro o al 90 %: más claros no llegan a 4,5:1.
 * Las líneas de la cuadrícula, en blanco translúcido a propósito: sólo aclaran el degradado.
 */
export function AuthShowcase() {
  return (
    <aside
      aria-label="Ejemplo de tu agenda: las reservas de tu página entran solas y cada cliente recibe su confirmación y su recordatorio."
      className="relative flex h-full flex-col justify-center overflow-hidden rounded-3xl bg-linear-to-br from-hero to-hero-end px-10 py-8 text-hero-foreground xl:px-14"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_85%)]"
      />
      <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-highlight/25 blur-3xl" />

      <div aria-hidden className="relative mx-auto w-full max-w-[34rem]">
        <p className="inline-flex items-center gap-2 rounded-full bg-hero-foreground px-3 py-1 text-sm font-semibold text-hero shadow-sm">
          {/* El punto verde de «en línea», igual en los dos modos: la píldora es clara en los dos (spec 019). */}
          <span className="size-2 rounded-full bg-emerald-500" />
          Agenda y reservas online
        </p>
        <p className="mt-4 text-[1.75rem] leading-[1.15] font-extrabold tracking-[-0.025em] [@media(min-height:800px)]:text-[2rem]">
          Tus clientes eligen su hora. Tú solo atiendes.
        </p>

        <div className="relative mt-7 text-foreground [@media(min-height:760px)]:mt-9">
          <HeroCalendar />
          <CalendarChips />
        </div>

        <dl className="mt-14 hidden gap-x-10 [@media(min-height:860px)]:flex">
          {PRODUCT_FACTS.map((fact) => (
            <div key={fact.label} className="flex flex-col-reverse">
              <dt className="text-sm text-hero-foreground/90">{fact.label}</dt>
              <dd className="text-2xl font-extrabold tracking-[-0.02em]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
