import { cn } from "@/lib/utils";
import { TECH_LABEL } from "./landing-styles";

/** Funciones de verdad de Agenda360, en mayúsculas: la cinta las pasa sin parar. */
const ITEMS = [
  "Reserva online 24/7",
  "Recordatorios automáticos",
  "«Confirmo que voy»",
  "Tablero de citas",
  "Historia clínica",
  "Pagos por transferencia",
  "Invitaciones de calendario",
  "Avisos en el celular",
  "Varias agendas",
  "Reportes",
  "Importar desde Excel",
];

/**
 * La cinta bajo el encabezado (prueba en dev, 2026-10-27), como la de getartcraft.com: la lista dos veces
 * seguidas, que se desliza media vuelta en 36 s y vuelve a empezar sin salto. Se detiene al pasar el ratón;
 * con «reducir movimiento», quieta. La segunda copia no la leen los lectores de pantalla.
 */
export function FeatureMarquee() {
  return (
    <div className="landing-marquee overflow-hidden border-y border-border bg-wall">
      <div className="landing-marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1 || undefined} aria-label={copy === 0 ? "Funciones" : undefined} className="flex shrink-0">
            {ITEMS.map((item) => (
              <li key={item} className={cn(TECH_LABEL, "flex h-11 items-center gap-3 px-6 whitespace-nowrap text-muted-foreground")}>
                <span aria-hidden className="size-1.5 bg-ink" />
                {item}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
