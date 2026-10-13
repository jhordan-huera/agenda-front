# Plan de implementación: Velocidad en el celular

**Rama**: `dev` · **Fecha**: 2026-10-13 · **Spec**: [spec.md](./spec.md)

## Resumen

Cuatro cambios sólo en el front, sin tocar la API ni los archivos compartidos.

## Diseño

1. **Datos de reservas por adelantado (RF-001)**.
   - `public/early-data.js`: un script propio, no en línea, porque la CSP no permite scripts en
     línea. Se carga con `async` desde `index.html`.
   - En `/book/<slug>` lanza `fetch("/api/public/businesses/<slug>")` con las mismas cabeceras que la
     app y guarda la promesa en `window.__agendaEarly`.
   - `src/lib/api/client.ts` la toma una sola vez si la ruta coincide (sólo GET y con la API en
     `/api`). Después sigue el mismo tratamiento de errores de siempre.
2. **Mapa al verlo (RF-002)**.
   - `business-location-card.tsx` monta el mapa perezoso sólo cuando su contenedor está a menos de
     300 px de la pantalla (`IntersectionObserver`).
   - Mientras tanto se ve el mismo esqueleto de 160 px, así que la página no salta.
3. **Pantalla de carga al instante (RF-003)**.
   - Un plugin de Vite (`transformIndexHtml`, sólo en build) mueve el `<link rel="stylesheet">` de la
     app del `<head>` al final del `<body>`.
   - El navegador dibuja lo anterior, la pantalla de carga con sus estilos en línea, sin esperar la
     hoja.
   - Los scripts de módulo no se ejecutan hasta que las hojas pendientes cargan (regla de HTML), así
     que React nunca pinta sin estilos.
4. **Zod fuera del paquete inicial (RF-004)**.
   - Alias de Vite: `zod` → `src/lib/zod-config.ts`, que importa `zod/v4` (el mismo módulo), aplica
     `z.config({ jitless: true })` y lo reexporta. Así la configuración va siempre antes de cualquier
     esquema, en el trozo que lo use.
   - `main.tsx` deja de importarlo.
   - Los formularios de login y registro cargan sus esquemas aparte (`auth-schemas.ts`): los piden al
     montarse y los esperan al enviar. *Cambio tras medir*: cargar esas páginas por ruta empeoraba el
     LCP del login (1,7 → 1,9 s), así que siguen en la carga inicial.

## Comprobación contra la constitución

| Principio | Cumple | Cómo |
|---|---|---|
| II. Privacidad | Sí | La petición adelantada es la misma pública de hoy. |
| IV. Local | Sí | Medición con la app compilada en local; nada en Vercel. |
| V. Compartido | Sí | No se tocan `lib/validations` ni los tipos: el alias es del front. |
| VI. Barato | Sí | Menos datos y la misma cantidad de peticiones a la API. |
| VII. Diseño | Sí | Sin cambios visibles; esqueleto del mapa del mismo alto. |

## Archivos

```text
public/early-data.js                          NUEVO
index.html                                    CAMBIA: <script src="/early-data.js" async>
src/lib/api/client.ts                         CAMBIA: reutiliza la petición adelantada
src/features/booking/business-location-card.tsx  CAMBIA: mapa al acercarse
vite.config.ts                                CAMBIA: alias de zod y plugin de la hoja de estilos
src/lib/zod-config.ts                         CAMBIA: reexporta zod configurado
src/main.tsx                                  CAMBIA: sin el import de zod-config
src/features/auth/auth-schemas.ts             NUEVO: esquemas del acceso aparte
src/features/auth/login-form.tsx, register-form.tsx  CAMBIAN: usan auth-schemas
```

## Comprobación

Script de medición en el scratchpad (`rendimiento.mjs`) antes y después, en las mismas
condiciones. Además, el mapa de fuentes del build para el paquete inicial, las pruebas de las specs
001 y 002, y login, registro y reserva con errores de validación.
