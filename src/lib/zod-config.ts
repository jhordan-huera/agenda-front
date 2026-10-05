import { z } from "zod";

// Zod no intenta compilar los validadores con eval: la política de seguridad (CSP, vercel.json)
// lo bloquea. Se importa antes que nada en main.tsx: Zod lo comprueba al crear cada esquema.
z.config({ jitless: true });
