import { cn } from "@/lib/utils";
import { CONTAINER } from "./section-heading";

/**
 * Para quién es (spec 030): las especialidades, cada una con lo que su formato de historia clínica ya trae
 * (los formatos de la plataforma, migraciones 009 y 011 del backend). Una tira tranquila, sin tarjetas:
 * como el directorio de la entrada de un consultorio.
 */
const SPECIALTIES = [
  { name: "Psicología", detail: "PHQ-9 y GAD-7 que se califican solos" },
  { name: "Odontología", detail: "Odontograma por pieza y superficie" },
  { name: "Nutrición", detail: "El IMC se calcula solo" },
  { name: "Fisioterapia", detail: "Mapa del cuerpo, de frente y de espalda" },
  { name: "Estética", detail: "Formato de medicina estética" },
];

export function AudienceSection() {
  return (
    <section aria-labelledby="para-quien-titulo" className="border-y border-border bg-counter">
      <div className={cn(CONTAINER, "grid grid-cols-1 gap-8 py-14 sm:py-16 lg:grid-cols-12 lg:gap-10")}>
        <div className="lg:col-span-3 lg:border-t lg:border-rule-strong lg:pt-4">
          <h2 id="para-quien-titulo" className="text-xl leading-tight font-bold tracking-[-0.015em] text-balance">
            Para tu especialidad
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Cada una tiene su formato de historia clínica, listo desde el primer día.
          </p>
        </div>
        <div className="lg:col-span-9">
          <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-6">
            {SPECIALTIES.map((specialty) => (
              <li key={specialty.name} className="border-t border-rule-strong py-4 lg:pb-0">
                <p className="font-semibold">{specialty.name}</p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{specialty.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Y también fonoaudiología, atención médica y cualquier profesional que atienda con cita.
          </p>
        </div>
      </div>
    </section>
  );
}
