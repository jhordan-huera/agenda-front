/** La página de reservas de ejemplo de la portada («Probar una página de reservas»). */
export const DEMO_BOOKING_PATH = "/book/jhordan";

/** Las anclas de la portada: las usan la barra de arriba, la regla de la derecha y el pie. */
export const LANDING_SECTIONS = {
  features: "funciones",
  data: "tus-datos",
  testimonial: "testimonio",
  faq: "preguntas",
  start: "empezar",
} as const;

/** Las secciones que siguen la barra de arriba y la regla, en su orden, con su nombre. */
export const TRACKED_SECTIONS: { id: string; label: string }[] = [
  { id: LANDING_SECTIONS.features, label: "Funciones" },
  { id: LANDING_SECTIONS.data, label: "Tus datos" },
  { id: LANDING_SECTIONS.faq, label: "Preguntas" },
  { id: LANDING_SECTIONS.start, label: "Empezar" },
];

/** Un testimonio de una clienta de Agenda360, con su permiso. */
export interface Testimonial {
  /** Lo que dijo, tal cual lo autorizó (sin comillas: las pone la portada). */
  quote: string;
  /** Su nombre, como aceptó que salga (p. ej. «María López» o «Dra. María L.»). */
  name: string;
  /** Su especialidad o su consultorio (p. ej. «Psicóloga clínica»). */
  role: string;
  /** Su ciudad, si quiere que salga (p. ej. «Quito»). */
  city?: string;
}

/**
 * El testimonio de la portada (spec 032). Mientras sea `null`, ni la sección ni su enlace del pie salen:
 * en la portada no hay testimonios inventados (constitución, principio III).
 *
 * Para publicarlo, cuando la clienta autorice por escrito el texto, su nombre y su especialidad (y, si
 * quiere, su ciudad), se cambia `null` por ese texto, sin retocarlo:
 *
 * ```ts
 * export const TESTIMONIAL: Testimonial | null = {
 *   quote: "…lo que dijo, palabra por palabra…",
 *   name: "…su nombre…",
 *   role: "…su especialidad…",
 *   city: "…su ciudad (opcional)…",
 * };
 * ```
 *
 * Con eso la sección aparece antes de las preguntas frecuentes, y su enlace («Lo que dicen»), en el pie.
 */
export const TESTIMONIAL: Testimonial | null = null;
