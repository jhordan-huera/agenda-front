---

description: "Tareas del rediseño de la pantalla de acceso"
---

# Tareas: Rediseño de la pantalla de acceso

**Entrada**: documentos de diseño en `specs/001-rediseno-acceso/`

**Requisitos previos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[contracts/componentes.md](./contracts/componentes.md), [quickstart.md](./quickstart.md)

**Pruebas**: la spec no pide pruebas automáticas nuevas. La comprobación es el build, el lint y la
verificación con Playwright y en el navegador de la fase final.

**Organización**: por historia de la spec, para poder comprobar cada una por separado.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas pendientes).
- **[US1]…[US5]**: historia de la spec a la que pertenece.
- Rutas relativas a la raíz de agenda-front.

---

## Fase 1: Preparación

**Propósito**: partir de una base que compila.

- [x] T001 Comprobar que `npm run build` y `npm run lint` pasan en `dev` antes de tocar nada (raíz de agenda-front)

---

## Fase 2: Base (bloquea las historias)

**Propósito**: las piezas compartidas que usan varias historias.

- [x] T002 [P] Sacar `FloatingChip` de `src/features/landing/hero-section.tsx` a `src/features/landing/floating-chip.tsx` (exportado, misma apariencia) e importarlo en `hero-section.tsx`
- [x] T003 [P] Añadir `eyebrow?: ReactNode` y `highlight?: string` a `AuthCardHeader` en `src/features/auth/auth-card-header.tsx`, usando `Eyebrow` y `GradientText` de `src/features/landing/section-heading.tsx` (sin ellos se ve como hoy)
- [x] T004 [P] Añadir `icon?: ReactNode` a `PasswordInput` en `src/components/shared/password-input.tsx`: icono `aria-hidden` a la izquierda y sitio en el campo; sin `icon`, igual que hoy

**Punto de control**: compila y la portada se ve igual que antes.

---

## Fase 3: Historia 1 - Iniciar sesión en una pantalla al nivel de la portada (P1) 🎯 MVP

**Objetivo**: login con el estilo nuevo y el mismo comportamiento.

**Prueba independiente**: entrar con `jhordan@demo.com` / `demo1234`, con una contraseña incorrecta
y con verificación en dos pasos (quickstart 1, 4, 5 y 6).

- [x] T005 [US1] Rehacer la columna izquierda de `src/components/layout/auth-layout.tsx`: `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]`, degradado radial sutil de la portada, logotipo arriba, formulario centrado `max-w-sm`, pie con © y privacidad
- [x] T006 [US1] Login con etiqueta "Hola de nuevo" y título "Inicia sesión en tu" + "agenda" en degradado en `src/pages/auth/login-page.tsx`
- [x] T007 [US1] En `src/features/auth/login-form.tsx`: email con icono `Mail` y contraseña con `LockKeyhole` (`h-11`), aviso de error `rounded-xl`, botón `h-11 w-full text-base` con `ArrowRight`; en `TwoFactorStep`, campos `h-11` y recuadro `rounded-xl`. Sin cambios de lógica

**Punto de control**: la historia 1 funciona sola.

---

## Fase 4: Historia 2 - Ver lo que hace Agenda360 junto al formulario (P2)

**Objetivo**: el panel en degradado con el calendario y las etiquetas, fijo y entero.

**Prueba independiente**: quickstart 1, 2, 3, 12 y 13.

- [x] T008 [P] [US2] Crear `AuthShowcase` en `src/features/auth/auth-showcase.tsx`: etiqueta en píldora translúcida con punto verde, titular blanco "Tus clientes eligen su hora. Tú solo atiendes.", `HeroCalendar` con las tres `FloatingChip` de la portada, los tres datos (24/7 · Gratis · Sin cuenta) sólo con `[@media(min-height:860px)]`, cuadrícula sutil de fondo, textos en blanco o blanco al 90 % como mínimo, `aside` con `aria-label`
- [x] T009 [US2] En `src/components/layout/auth-layout.tsx`, la columna derecha (sólo `lg`): `sticky top-0 h-dvh p-3`, panel `rounded-3xl bg-linear-to-br from-ink to-lilac-ink overflow-hidden` con `AuthShowcase`; quitar el import de `AgendaWeek`
- [x] T010 [US2] Eliminar `src/features/auth/agenda-week.tsx` (comprobar antes que no queda ningún import)

**Punto de control**: historias 1 y 2 funcionan.

---

## Fase 5: Historia 3 - Acceder desde el celular (P2)

**Objetivo**: sólo el formulario, sin desbordes entre 320 y 1023 px.

**Prueba independiente**: quickstart 11.

- [x] T011 [US3] Ajustar márgenes y tamaños del marco para 320–1023 px en `src/components/layout/auth-layout.tsx` (sin panel, `min-w-0` donde haga falta, título que no se corte)

---

## Fase 6: Historia 4 - Registro y recuperación con el mismo marco (P2)

**Objetivo**: registro abierto y cerrado y recuperación con el estilo nuevo.

**Prueba independiente**: quickstart 7, 8 y 9.

- [x] T012 [P] [US4] En `src/pages/auth/register-page.tsx`: etiqueta "Gratis para empezar" y título "Crea tu cuenta" + "gratis" en degradado; registro cerrado con icono en recuadro `rounded-xl bg-accent text-ink`
- [x] T013 [P] [US4] En `src/features/auth/register-form.tsx`: campos `h-11`, contraseñas `h-11`, botón `h-11 text-base`, aviso de error `rounded-xl`. Sin cambios de lógica ni del CAPTCHA
- [x] T014 [P] [US4] En `src/pages/auth/forgot-password-page.tsx`: tarjeta `rounded-2xl border bg-card shadow-sm` con el icono en recuadro `bg-accent text-ink`; mismo contenido

---

## Fase 7: Historia 5 - Orientar al paciente que llega al login (P3)

**Objetivo**: la nota para pacientes.

**Prueba independiente**: quickstart 10.

- [x] T015 [US5] Añadir debajo del formulario en `src/pages/auth/login-page.tsx`, tras una línea divisoria, la nota: "¿Vienes a reservar una cita? No necesitas cuenta: usa el enlace que te compartió tu profesional."

---

## Fase 8: Cierre y comprobación

- [x] T016 `npm run build` y `npm run lint` sin errores (raíz de agenda-front)
- [x] T017 Playwright en local (script en el scratchpad, puertos propios): desplazamiento horizontal 0 a 320 y 390 px (WebKit) en `/login`, `/register` y `/forgot-password`; panel entero en 1355 × 715 y capturas a 1440 × 900; orden del tabulador sin entrar al panel; contraste ≥ 4,5:1 de los textos
- [x] T018 Iniciar sesión de verdad contra la API local: cuenta correcta, contraseña incorrecta y verificación en dos pasos (quickstart 4–6); registro cerrado (quickstart 8)
- [x] T019 Marcar las tareas hechas en este archivo y el estado de la spec

---

## Dependencias y orden

- **Fase 1** → **Fase 2** → historias. La fase 2 bloquea a todas.
- **Historia 1**: después de la fase 2 (T003, T004).
- **Historia 2**: después de la fase 2 (T002) y de T005, porque T009 cambia el mismo archivo.
- **Historia 3**: después de T009 (mismo archivo).
- **Historia 4**: después de T003; independiente de las historias 1–3.
- **Historia 5**: después de T006 (mismo archivo).
- **Fase 8**: al final.

### En paralelo

- T002, T003 y T004 (archivos distintos).
- T008 junto con T006–T007.
- T012, T013 y T014 entre sí.

## Ejemplo en paralelo: historia 4

```text
Tarea: "Etiqueta y título con degradado en src/pages/auth/register-page.tsx"
Tarea: "Campos h-11 en src/features/auth/register-form.tsx"
Tarea: "Tarjeta de soporte en src/pages/auth/forgot-password-page.tsx"
```

## Estrategia

1. Fases 1 y 2, luego la historia 1 (MVP: el login ya se ve nuevo y funciona).
2. Historias 2 y 3 (panel y celular), luego la 4 y la 5.
3. Fase 8 y un solo commit en `dev` con el rediseño, sin push ni PR hasta que lo pida el dueño del
   producto.

## Resultado (2026-10-13)

- Build y lint sin errores ni avisos.
- Playwright: panel entero a 1355 × 715, 1440 × 900, 1024 × 700 y 1280 × 680; login sin
  desplazamiento hasta 700 px de alto (a 680 px el formulario se desplaza 19 px y el panel sigue
  fijo y entero); 0 px de desborde a 320 y 390 px en las tres pantallas (WebKit); el tabulador no
  entra al panel; contraste mínimo 4,55:1; sin animaciones con "reducir movimiento".
- Login real contra la API local: contraseña incorrecta, cuenta correcta y verificación en dos
  pasos; registro cerrado; la portada sigue igual.
- Cambios fuera de lo previsto en el plan: las tres etiquetas pasaron a un componente común
  (`CalendarChips`) y los datos de la portada a `product-facts.ts`, para no repetirlos; la
  etiqueta en píldora (`Eyebrow`) usa un azul un poco más oscuro porque sobre su fondo pastel daba
  4,44:1 (también mejora la portada).
