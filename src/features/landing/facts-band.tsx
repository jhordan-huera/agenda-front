import { cn } from "@/lib/utils";
import { CONTAINER } from "./section-heading";

/**
 * Cuatro hechos de Agenda360, como la franja de cifras del ejemplo pero sin porcentajes ni clientes
 * inventados (spec 032): cada cifra es algo que la app hace o no pide.
 */
const FACTS = [
  { value: "24/7", label: "Reservas online" },
  { value: "0", label: "Cuentas para tus pacientes" },
  { value: "1", label: "Enlace para WhatsApp" },
  { value: "LOPDP", label: "Datos protegidos" },
];

/**
 * La franja de hechos (spec 032): una tarjeta blanca con cuatro celdas separadas por renglones, de dos en
 * dos en el celular. La cifra, grande y en el color de la marca; lo que significa, debajo, en gris. El lector
 * de pantalla las lee juntas («24/7 Reservas online»).
 */
export function FactsBand() {
  return (
    <section aria-labelledby="hechos-titulo" className="pb-16 sm:pb-24">
      <h2 id="hechos-titulo" className="sr-only">
        Agenda360 en cuatro datos
      </h2>
      <div className={CONTAINER}>
        <ul className="grid grid-cols-2 overflow-hidden rounded-2xl bg-card shadow-sheet lg:grid-cols-4">
          {FACTS.map(({ value, label }, index) => (
            <li
              key={label}
              className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-7 text-center sm:py-9",
                // Los renglones entre celdas: a la izquierda de la segunda de cada fila y arriba de la segunda fila.
                index % 2 === 1 && "border-l border-border",
                index >= 2 && "border-t border-border lg:border-t-0",
                index === 2 && "lg:border-l",
              )}
            >
              <span className="text-[2rem] leading-none font-bold tracking-[-0.03em] text-ink tabular-nums sm:text-[2.5rem]">{value}</span>{" "}
              <span className="text-sm leading-snug text-muted-foreground sm:text-[0.9375rem]">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
