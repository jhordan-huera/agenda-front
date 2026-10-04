export type DataErrorCode =
  | "not_found"
  | "conflict"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "plan_limit"
  | "rate_limited"
  | "network"
  | "unavailable"
  | "server";

/** Error de la capa de datos con mensaje listo para mostrar al usuario. */
export class DataError extends Error {
  readonly code: DataErrorCode;

  constructor(code: DataErrorCode, message: string) {
    super(message);
    this.name = "DataError";
    this.code = code;
  }
}

export function getErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error inesperado. Inténtalo de nuevo.",
): string {
  return error instanceof DataError ? error.message : fallback;
}
