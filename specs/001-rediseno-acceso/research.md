# Investigación: Rediseño de la pantalla de acceso

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-10-13

No quedaron dudas abiertas en la especificación. Aquí se resuelven las decisiones técnicas que la
afectan.

## 1. Reutilizar el calendario y las etiquetas de la portada

- **Decisión**: el panel usa `HeroCalendar` tal cual. `FloatingChip`, hoy privado en
  `hero-section.tsx`, pasa a su propio archivo `src/features/landing/floating-chip.tsx` para usarlo
  en la portada y en el acceso. `Eyebrow` y `GradientText` se importan de
  `src/features/landing/section-heading.tsx`.
- **Por qué**: la spec pide que portada y acceso cuenten lo mismo (mismos datos de ejemplo). Una
  sola fuente evita que se desincronicen.
- **Alternativas descartadas**: mantener `AgendaWeek` (estilo anterior, sin estados) o copiar
  el calendario (dos copias que mantener). Mover los componentes a `components/shared`: hoy sólo
  los usan la portada y el acceso, que son pantallas de marketing; no hace falta todavía.

## 2. Los colores en la pantalla de acceso

- **Hallazgo**: `BrandThemeProvider` pone los colores del negocio en `<html>` sólo dentro del panel
  y los quita al salir (`removeProperty`). La pantalla de acceso siempre usa los colores de
  Agenda360 (`--ink #4a6cb0`, `--lilac-ink #5a4ea3`).
- **Decisión**: igualmente, todo se pinta con los tokens (`from-ink to-lilac-ink`, `bg-accent`,
  `text-ink`…), sin colores fijos (constitución, principio VII).
- **Consecuencia**: el supuesto de la spec sobre "los colores de una sesión anterior" no ocurre; se
  corrige en la spec.

## 3. Contraste del texto blanco sobre el degradado

- **Cálculo** (WCAG 2.x): blanco sobre `#4a6cb0` = 5,2:1; blanco sobre `#5a4ea3` = 6,9:1. Blanco al
  80 % sobre `#4a6cb0` ≈ 3,9:1, que no llega a 4,5:1.
- **Decisión**: el titular y el texto del panel van en blanco puro. Los textos secundarios usan como
  mínimo blanco al 90 % y tamaño base (≈ 4,5:1). Se mide de nuevo en la verificación.
- **Alternativa descartada**: textos al 75–85 % como en la llamada final de la portada; no cumplen
  RF-014 en texto pequeño.

## 4. Que el panel quepa en ventanas bajas

- **Medidas**: la ventana del dueño mide unos 1355 × 715 px. El calendario de la portada mide unos
  410 px de alto a ese ancho, el titular con su etiqueta unos 130 px y el margen del panel unos
  100 px: unos 640 px en total, más los 30 px que sobresalen las etiquetas flotantes.
- **Decisión**: panel a pantalla completa (`h-dvh`) y fijo (`sticky top-0`) en escritorio, con el
  contenido centrado. Los tres datos de la portada sólo aparecen con altura suficiente (variante de
  Tailwind `[@media(min-height:860px)]:flex`). Si la ventana es aún más baja (menos de 700 px), el
  titular se reduce y el panel nunca muestra barra de desplazamiento (`overflow-hidden`).
- **Alternativas descartadas**: escalar el calendario con `transform` (texto borroso y medidas
  falsas) o quitar el calendario en ventanas bajas (se pierde el sentido del panel).

## 5. Campos con icono

- **Hallazgo**: el proyecto ya pone iconos dentro de los campos de búsqueda (lupa en
  `clients-page.tsx`: `relative` + icono `absolute left-3` + `pl-9`).
- **Decisión**: el mismo patrón. `PasswordInput` recibe un `icon` opcional (sin él se ve igual que
  hoy en Configuración y en el resto de la app). El email lleva su icono con el mismo envoltorio.
  Alto de 44 px (`h-11`) en las pantallas de acceso.
- **Alternativa descartada**: un componente nuevo `InputWithIcon` para toda la app; hoy sólo lo
  usaría el acceso y crece el alcance.

## 6. Panel decorativo y accesibilidad

- **Decisión**: el panel es un `<aside>` con una descripción para lectores de pantalla. Su contenido
  visual es `aria-hidden` (calendario y etiquetas ya lo son) y no tiene enlaces ni botones, así que
  el tabulador no pasa por él. Las animaciones usan las mismas clases que la portada, con
  `motion-reduce:animate-none`.

## 7. Fondo en el celular

- **Decisión**: la columna del formulario lleva el mismo degradado radial sutil que la portada (de
  `--ink` al 8–12 % en una esquina). Se ve en el celular y en escritorio y no afecta al contraste.

## Fuentes

- Skill UI UX Pro Max (búsquedas de formularios y accesibilidad): etiquetas visibles, estado de
  envío, errores enfocables, jerarquía de títulos, probar a 320/375/414/768/1024/1440 px.
- Código actual: `auth-layout.tsx`, `login-form.tsx`, `register-form.tsx`,
  `forgot-password-page.tsx`, `register-page.tsx`, `password-input.tsx`, `hero-section.tsx`,
  `hero-calendar.tsx`, `section-heading.tsx`, `brand-theme-provider.tsx`, `index.css`.
