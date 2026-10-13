# Contrato de componentes: pantallas de acceso

Interfaz de los componentes que se crean o cambian. Todo lo que no figura aquí mantiene su
interfaz actual.

## `AuthCardHeader` (cambia, compatible)

```ts
interface AuthCardHeaderProps {
  title: string;
  description: ReactNode;
  /** Etiqueta en píldora encima del título (opcional). */
  eyebrow?: ReactNode;
  /** Final del título, en el degradado de la marca (opcional). Se muestra tras un espacio. */
  highlight?: string;
}
```

- Sin `eyebrow` ni `highlight` se ve como hoy, con la tipografía nueva.
- El título sigue siendo el único `<h1>` de la página.

## `PasswordInput` (cambia, compatible)

```ts
type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type"> & {
  /** Icono decorativo a la izquierda (p. ej. <LockKeyhole />). Sin él, igual que hoy. */
  icon?: ReactNode;
};
```

- Con `icon`, el campo deja sitio a la izquierda y el icono es `aria-hidden`.
- El botón de mostrar u ocultar y sus etiquetas ("Mostrar contraseña" / "Ocultar contraseña") no
  cambian.
- Quien pase `className` decide el alto (en el acceso, `h-11`).

## `FloatingChip` (se mueve a `features/landing/floating-chip.tsx`)

```ts
function FloatingChip(props: { className: string; delay: number; children: ReactNode }): JSX.Element;
```

- Misma apariencia y animación que hoy en la portada; decorativo (`aria-hidden`), oculto por
  debajo de `sm`.

## `CalendarChips` (nuevo, `features/landing/floating-chip.tsx`)

```ts
function CalendarChips(): JSX.Element;
```

- Las tres etiquetas del calendario de ejemplo ("Nueva reserva online", "Confirmación enviada",
  "Recordatorio") en sus posiciones; van en un contenedor `relative` junto a `HeroCalendar`. Las
  usan la portada y el acceso.

## `PRODUCT_FACTS` (se mueve a `features/landing/product-facts.ts`)

- Los tres datos ciertos de la portada (24/7, Gratis, Sin cuenta), compartidos con el acceso.

## `AuthShowcase` (nuevo, `features/auth/auth-showcase.tsx`)

```ts
function AuthShowcase(): JSX.Element;
```

- Sin props: el contenido es fijo (datos de ejemplo de la portada).
- Devuelve el panel en degradado. Quien lo usa decide cuándo se ve (en `AuthLayout`, sólo `lg`).
- Accesibilidad: lo envuelve un `<aside aria-label="…">` con una frase que describe el ejemplo; sin
  elementos enfocables.

## `AuthLayout` (cambia)

- Misma ruta y mismo `<Outlet />`; sigue montando `RedirectIfAuthenticated` y
  `useInstallableApp()`.
- Deja de importar `AgendaWeek` y usa `AuthShowcase`.

## `AgendaWeek` (se elimina)

- Su único uso era `AuthLayout`.
