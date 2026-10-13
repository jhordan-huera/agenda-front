# Plan de implementación: Rediseño de la pantalla de acceso

**Rama**: `dev` · **Fecha**: 2026-10-13 · **Spec**: [spec.md](./spec.md)

**Entrada**: especificación aprobada en `specs/001-rediseno-acceso/spec.md`

## Resumen

Las pantallas de acceso (login con su paso de verificación, registro abierto y cerrado y
recuperación) pasan al estilo de la portada nueva. A la izquierda va el formulario, sobre un fondo
con un degradado sutil, con título, etiqueta, campos más amplios con icono y una nota para
pacientes. A la derecha, en escritorio, un panel fijo en el degradado de la marca con un titular,
el calendario de la portada y sus etiquetas flotantes. Sólo cambia el front: se reutilizan los
componentes de la portada y no se toca la lógica de los formularios. Ver
[research.md](./research.md).

## Contexto técnico

**Lenguaje/versión**: TypeScript 6 + React 19

**Dependencias principales**: Vite, Tailwind CSS v4, shadcn/Radix, lucide-react (iconos),
React Router. Ninguna dependencia nueva.

**Almacenamiento**: no aplica (sin cambios de datos ni de API).

**Pruebas**: `npm run build` (incluye `tsc -b`) y `npm run lint` (oxlint). Verificación visual y de
desbordamiento con Playwright (Chromium y WebKit) sobre el front local con la API local
(`dev:local`, datos demo).

**Plataforma**: web (escritorio y celular, también la app instalada).

**Tipo de proyecto**: aplicación web (este repo: front).

**Objetivos de rendimiento**: sin peso nuevo apreciable. El calendario ya está en el paquete de la
portada; el login lo carga en su propio fragmento (las páginas ya se cargan por ruta).

**Restricciones**: 0 px de desplazamiento horizontal entre 320 y 1023 px; panel entero en 1355 × 715
px; contraste ≥ 4,5:1; sin animaciones con "reducir movimiento".

**Alcance**: 1 marco (`AuthLayout`), 3 páginas, 2 formularios, 1 componente nuevo del panel, 1
componente movido y 1 componente que se elimina.

## Comprobación contra la constitución

*Antes de la investigación y de nuevo tras el diseño.*

| Principio | Cumple | Cómo |
|---|---|---|
| I. Todo en español | Sí | Textos de la interfaz y artefactos SDD en español. |
| II. Privacidad | Sí | Sólo datos de ejemplo de la portada; sin datos reales ni registros nuevos. |
| III. Decisiones de producto | Sí | "¿Olvidaste tu contraseña?" sigue llevando al soporte (no hay recuperación automática); sin precios, testimonios ni cifras inventadas; las únicas cifras son los tres hechos ciertos de la portada. |
| IV. Se comprueba en local | Sí | Build, lint y Playwright en local; nada en Vercel ni contra producción. |
| V. Código compartido | Sí | No toca tipos, validaciones ni plantillas compartidas: no hace falta `sync:shared`. |
| VI. Sencillo y barato | Sí | Sin dependencias ni servicios nuevos; sin cambios en la API. |
| VII. Diseño | Sí | Sora, tokens de color, `grid-cols-1` de base, 44 px táctiles, etiquetas, foco y `motion-reduce`. |

Sin infracciones: la sección "Seguimiento de complejidad" no aplica.

## Estructura del proyecto

### Documentación (esta función)

```text
specs/001-rediseno-acceso/
├── spec.md              # Especificación aprobada
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas (fase 0)
├── contracts/
│   └── componentes.md   # Interfaz de los componentes que cambian (fase 1)
├── quickstart.md        # Cómo comprobarlo de punta a punta (fase 1)
├── checklists/
│   └── requirements.md  # Calidad de la spec
└── tasks.md             # Lo genera /speckit-tasks
```

No hay `data-model.md`: la función no tiene datos ni entidades.

### Código (agenda-front)

```text
src/
├── components/
│   ├── layout/
│   │   └── auth-layout.tsx            # CAMBIA: marco nuevo (fondo, columnas, panel fijo)
│   └── shared/
│       └── password-input.tsx         # CAMBIA: prop opcional `icon` (sin ella, igual que hoy)
├── features/
│   ├── auth/
│   │   ├── auth-showcase.tsx          # NUEVO: panel en degradado (titular, calendario, etiquetas, datos)
│   │   ├── auth-card-header.tsx       # CAMBIA: `eyebrow` y `highlight` opcionales
│   │   ├── login-form.tsx             # CAMBIA: campos h-11 con icono, botón a lo ancho, paso 2FA al mismo estilo
│   │   ├── register-form.tsx          # CAMBIA: campos h-11
│   │   └── agenda-week.tsx            # SE ELIMINA (lo reemplaza el calendario de la portada)
│   └── landing/
│       ├── floating-chip.tsx          # NUEVO: FloatingChip sacado de hero-section.tsx
│       └── hero-section.tsx           # CAMBIA: importa FloatingChip (misma apariencia)
└── pages/auth/
    ├── login-page.tsx                 # CAMBIA: etiqueta, título con degradado y nota para pacientes
    ├── register-page.tsx              # CAMBIA: etiqueta y título con degradado (abierto y cerrado)
    └── forgot-password-page.tsx       # CAMBIA: tarjeta de soporte al estilo nuevo
```

**Decisión de estructura**: se respeta la organización actual (`features/<área>` para la lógica de
cada área, `components/layout` para los marcos, `pages` para las rutas). El panel vive en
`features/auth` porque sólo lo usa el acceso. La clase `.marker` de `index.css` se queda: la usan
otras diez pantallas.

## Diseño (fase 1)

### Marco (`AuthLayout`)

- Cuadrícula `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]` a altura completa.
- Columna izquierda: degradado radial sutil (como el `hero` de la portada), logotipo arriba,
  formulario centrado con `max-w-sm` y pie con © y "Política de privacidad".
- Columna derecha (sólo `lg`): `sticky top-0 h-dvh p-3`. Dentro va el panel redondeado
  (`rounded-3xl`) con `bg-linear-to-br from-ink to-lilac-ink`, la cuadrícula sutil de la llamada
  final de la portada y `overflow-hidden`.

### Panel (`AuthShowcase`)

- Etiqueta en píldora blanca translúcida ("Agenda y reservas online", con punto verde) y titular
  en blanco: "Tus clientes eligen su hora. Tú solo atiendes.", el mismo mensaje de la portada.
- `HeroCalendar` con las tres `FloatingChip` en las mismas posiciones que en la portada.
- Los tres hechos de la portada (24/7 · Gratis · Sin cuenta) en blanco, visibles sólo con altura
  suficiente.
- Para lectores de pantalla: el `<aside>` lleva una etiqueta breve y el resto es decorativo.

### Formularios

- Títulos: `AuthCardHeader` con `eyebrow` y `highlight`. Login: "Hola de nuevo" · "Inicia sesión en
  tu **agenda**". Registro: "Gratis para empezar" · "Crea tu cuenta **gratis**". Registro cerrado y
  recuperación: sin etiqueta y con el estilo nuevo.
- Login: email con icono `Mail`, contraseña con `LockKeyhole`, ambos `h-11`; "Recordarme" y
  "¿Olvidaste tu contraseña?" iguales; botón `h-11 w-full text-base` con `ArrowRight`. Paso de
  verificación: campos `h-11` y el recuadro de 2FA con `rounded-xl`. La lógica no cambia.
- Debajo del login, separada por una línea: "¿Vienes a reservar una cita? No necesitas cuenta: usa
  el enlace que te compartió tu profesional."
- Registro: campos `h-11` y botón `h-11 text-base`. La lógica y el CAPTCHA no cambian.
- Recuperación: el contacto de soporte en una tarjeta blanca (`rounded-2xl border bg-card
  shadow-sm`) con el icono en un recuadro `bg-accent text-ink`.

Interfaz de cada componente: [contracts/componentes.md](./contracts/componentes.md).
Comprobación: [quickstart.md](./quickstart.md).

## Fuera de alcance

- API, base de datos y migraciones (no hay).
- La beta (`agenda-beta`).
- La pantalla "Activa la verificación en dos pasos" del super admin y el onboarding: tienen su
  propio marco.

## Comprobación tras el diseño

Se repasó la tabla de la constitución con el diseño de arriba: sigue cumpliendo todo, sin
excepciones que justificar.
