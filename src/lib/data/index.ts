import { apiRepository } from "./api-repository";
import type { DataRepository } from "./repository";

/**
 * Punto único de acceso a datos de la aplicación: la API REST de agenda-backend.
 * Los componentes y hooks sólo usan `data.*`, nunca fetch directamente.
 */
export const data: DataRepository = apiRepository;

export { DataError, getErrorMessage } from "./errors";
export type * from "./repository";
