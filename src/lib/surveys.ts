/**
 * Encuesta después de la cita (spec 048): lo que se calcula en el navegador. Funciones puras: las comprueba
 * `npm run check:surveys`.
 */

/** La estrella que trae el enlace del email (`?estrellas=4`): de 1 a 5, o null si no trae una válida. */
export function starsFromParams(params: URLSearchParams): number | null {
  const value = params.get("estrellas");
  if (!value || !/^[1-5]$/.test(value)) return null;
  return Number(value);
}

/** «4,5»: el promedio con un decimal y coma, como se escribe en Ecuador. */
export const formatAverage = (value: number) => value.toLocaleString("es-EC", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Las barras por estrella, de 5 a 1: cuántas y qué parte del total (0 a 100, redondeado). */
export function ratingBars(byRating: readonly number[]): { stars: number; count: number; percent: number }[] {
  const total = byRating.reduce((sum, value) => sum + value, 0);
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = byRating[stars - 1] ?? 0;
    return { stars, count, percent: total === 0 ? 0 : Math.round((count / total) * 100) };
  });
}
