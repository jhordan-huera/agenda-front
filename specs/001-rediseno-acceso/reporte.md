# Reporte final: Rediseño de la pantalla de acceso

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tareas**: [tasks.md](./tasks.md)

**Estado**: Implementada en dev · **Fecha**: 2026-10-13

**Repos**: agenda-front · **Migración**: No

## Resumen

El login, el registro (abierto y cerrado) y "¿Olvidaste tu contraseña?" tienen ahora el estilo de
la portada nueva. En escritorio, a la derecha, un panel en el degradado de la marca muestra el
calendario de ejemplo con la reserva que entra. Los campos son más grandes y el login tiene una
nota para los pacientes que llegan buscando cómo reservar. El acceso funciona exactamente igual que
antes, también con la verificación en dos pasos.

## Qué se entrega

| Historia | Prioridad | Estado | Notas |
|---|---|---|---|
| H1 – Iniciar sesión al nivel de la portada | P1 | Hecha | También el paso del código de verificación |
| H2 – Ver lo que hace Agenda360 junto al formulario | P2 | Hecha | Panel en degradado, fijo y entero |
| H3 – Acceder desde el celular | P2 | Hecha | Sin panel, sin desbordes |
| H4 – Registro y recuperación con el mismo marco | P2 | Hecha | Registro abierto, cerrado y recuperación |
| H5 – Orientar al paciente que llega al login | P3 | Hecha | Nota debajo del formulario |

## Comprobación

| Requisito o criterio | Resultado | Cómo se comprobó |
|---|---|---|
| RF-001 – Identidad de la portada | Cumple | Capturas a 1355 × 715 y 1440 × 900 comparadas con la portada |
| RF-002 – Etiqueta y título con degradado | Cumple | Capturas de login ("Hola de nuevo") y registro ("Gratis para empezar") |
| RF-003 – Campos de 44 px con icono, botón a lo ancho | Cumple | Capturas; campos `h-11` |
| RF-004 – Mismo comportamiento del login | Cumple | Playwright contra la API local: contraseña incorrecta (aviso "Email o contraseña incorrectos."), cuenta correcta (entra al panel), verificación en dos pasos (entra a /admin) |
| RF-005 – Panel con titular, calendario y etiquetas | Cumple | Capturas; 3 etiquetas en el panel |
| RF-006 – Sólo datos de ejemplo y hechos ciertos | Cumple | Mismo calendario y datos que la portada; sin testimonios, cifras de usuarios ni precios |
| RF-007 – Panel entero desde 700 px de alto; datos sólo con altura | Cumple | Panel entero a 1355 × 715, 1024 × 700 y 1280 × 680; datos visibles a 1440 × 900 y ocultos por debajo de 860 px |
| RF-008 – Panel fijo al desplazar el registro | Cumple | Registro a 1355 × 715 desplazado 60 px: el panel sigue a 12 px del borde |
| RF-009 – Celular sin panel ni desbordes | Cumple | WebKit a 320 y 390 px en `/login`, `/register` y `/forgot-password`: 0 px de desborde, panel oculto |
| RF-010 – Registro, cerrado y recuperación con el mismo marco | Cumple | Capturas de las tres pantallas; registro cerrado probado cerrando el registro en la base local |
| RF-011 – Nota para pacientes | Cumple | Captura del login |
| RF-012 – Sin animaciones con "reducir movimiento" | Cumple | Calendario y etiquetas con `animation-name: none` |
| RF-013 – Panel decorativo fuera del tabulador | Cumple | 12 pulsaciones de Tab: ninguna entra al panel; el panel tiene `aria-label` |
| RF-014 – Contraste ≥ 4,5:1 | Cumple | Medido en todos los textos de las tres pantallas: mínimo 4,55:1 |
| RF-015 – Colores de los tokens del tema | Cumple | Sólo clases de tokens (`ink`, `lilac-ink`, `accent`…); revisión del código |
| RF-016 – Sin cambios en la API ni migración | Cumple | El commit sólo toca agenda-front |
| CE-001 – 0 px de desborde a 320 y 390 px | Cumple | Ver RF-009 |
| CE-002 – Panel entero a 1355 × 715 | Cumple | Contenido entre 73 y 674 px dentro del panel (12–703 px) |
| CE-003 – Se entra con y sin verificación en dos pasos | Cumple | Ver RF-004 |
| CE-004 – Contraste ≥ 4,5:1 | Cumple | Ver RF-014 |
| CE-005 – Aprobación del dueño del producto | Pendiente | La revisa en `localhost:5173/login` |

**Pruebas automáticas**: `npm run build` y `npm run lint` sin errores ni avisos (repetidos al
generar este reporte). Verificación con Playwright (Chromium y WebKit) contra la API y la base
locales, con las cuentas demo.

## Cambios respecto al plan

- Las tres etiquetas flotantes pasaron a un componente común (`CalendarChips`) y los tres datos de
  la portada a `product-facts.ts`, para no repetirlos en la portada y el acceso.
- La etiqueta en píldora (`Eyebrow`) usa un azul un poco más oscuro: sobre su fondo pastel daba
  4,44:1. El cambio también mejora las etiquetas de la portada.
- La etiqueta del panel es una píldora blanca con texto azul (no translúcida): el blanco sobre la
  píldora translúcida daba 3,84:1.

## Pendientes y riesgos

- En ventanas de menos de 700 px de alto (fuera de lo que pide la spec) el formulario del login se
  desplaza un poco (19 px a 680 px de alto); el panel sigue fijo y entero.
- Falta la aprobación visual del dueño del producto (CE-005).

## Commits

| Repo | Commit | Mensaje |
|---|---|---|
| agenda-front | 28ac22d | Spec 001: pantallas de acceso al estilo de la portada |

## Cómo publicarlo

1. Sin migración.
2. PR `dev` → `main` en agenda-front.
3. Después de publicar: comprobar que el despliegue de Vercel del front quede "Ready" y abrir
   `/login` en el celular y en el ordenador.

## Texto para el PR

Rediseño de las pantallas de acceso (spec 001): login, registro y recuperación al estilo de la
portada, con el panel en degradado y el calendario de ejemplo en escritorio, campos más grandes y
una nota para pacientes. Sin cambios en la API ni migración.
Reporte: [specs/001-rediseno-acceso/reporte.md](https://github.com/jhordan-huera/agenda-front/blob/main/specs/001-rediseno-acceso/reporte.md)
