---

description: "Tareas de Velocidad en el celular"
---

# Tareas: Velocidad en el celular

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md)

## Fase 1: Implementación

- [x] T001 [P] [US1] Crear `public/early-data.js` y cargarlo con `async` en `index.html`
- [x] T002 [US1] Reutilizar la petición adelantada en `src/lib/api/client.ts` (una vez, misma ruta, GET, API en `/api`)
- [x] T003 [P] [US2] Mapa al acercarse en `src/features/booking/business-location-card.tsx`
- [x] T004 [P] [US3] Plugin de Vite que mueve la hoja de estilos al final del `<body>` en `vite.config.ts`
- [x] T005 [P] [US4] Alias `zod` → `src/lib/zod-config.ts` (reexporta `zod/v4` configurado) en `vite.config.ts`; quitar el import de `src/main.tsx`
- [x] T006 [US4] Esquemas del acceso cargados aparte en `src/features/auth/auth-schemas.ts` (login y registro siguen en la carga inicial: por ruta empeoraba su LCP)

## Fase 2: Comprobación

- [x] T007 `npm run build` y `npm run lint`; Zod fuera del paquete inicial (mapa de fuentes)
- [x] T008 Medición antes/después con `rendimiento.mjs` (portada, login, reservas con y sin mapa)
- [x] T009 Pruebas de las specs 001 y 002; login, registro y reserva con errores de validación; sin errores de CSP en la consola; el mapa aparece al bajar
- [x] T010 `reporte.md` y commit en `dev`, sin push

## Resultado

Ver el [reporte final](./reporte.md).
