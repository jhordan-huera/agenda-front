/** Uso a partir del cual se avisa al usuario (80 % del límite). */
export function isNearLimit(used: number, limit: number | null): boolean {
  return limit !== null && used >= limit * 0.8;
}
