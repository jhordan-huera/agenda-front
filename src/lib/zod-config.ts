// Toda la app importa "zod" a través de este archivo (alias de vite.config.ts): la configuración se
// aplica antes de crear cualquier esquema, en el mismo trozo que lo usa, y Zod no entra en la carga
// inicial. "zod/v4" es el mismo módulo que "zod" (el alias sólo afecta a "zod" a secas).
import { z } from "zod/v4";

// Zod no intenta compilar los validadores con eval: la política de seguridad (CSP, vercel.json)
// lo bloquea y cada intento deja un error en la consola. Zod lo comprueba al crear cada esquema.
z.config({ jitless: true });

export * from "zod/v4";
