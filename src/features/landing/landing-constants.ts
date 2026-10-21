/** La página de reservas de ejemplo de la portada («Probar una página de reservas»). */
export const DEMO_BOOKING_PATH = "/book/jhordan";

/** Las anclas de la portada: las usan la barra de arriba y el pie. */
export const LANDING_SECTIONS = {
  howItWorks: "como-funciona",
  highlights: "funciones",
  faq: "preguntas",
} as const;

/**
 * La escena de la portada (segundos desde que carga): el paciente marca su hora en BookingSample y la cita
 * llega a DaySample, con su aviso. Con «reducir movimiento», todo ya está en su sitio.
 */
export const SCENE = { mark: 0.7, arrive: 1.3, notice: 1.5 };
