import { DataError } from "@/lib/data/errors";

/**
 * Los esquemas del acceso (y con ellos Zod) se cargan aparte: el login y el registro se ven sin
 * esperarlos. El formulario los pide al montarse, así que al enviar ya están.
 */
export const loadAuthSchemas = () =>
  import("@/lib/validations/auth").catch(() => {
    throw new DataError("network", "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
  });
