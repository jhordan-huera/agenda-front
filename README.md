# Agenda360 · Frontend (agenda-front)

Plataforma SaaS de agenda y reservas para profesionales independientes y pequeños negocios
(psicólogos, odontólogos, nutricionistas, entrenadores, salones de belleza, abogados…).

Este es el frontend (React + Vite). Los datos, la autenticación y los emails los gestiona la API
[`agenda-backend`](../../Backend/agenda-backend) con PostgreSQL.

## Ejecutar

Requisitos: Node.js 22.18 o superior y la API en marcha (ver el README de agenda-backend).

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>. Vite redirige las peticiones a `/api` hacia la API
(`http://localhost:4000` por defecto; se cambia con `API_PROXY_TARGET` en `.env.local`).

Si en la API se cargaron los datos demo (`npm run db:seed`), todas las cuentas usan la contraseña
`demo1234`:

| Cuenta | Negocio | Rol | Para probar |
| --- | --- | --- | --- |
| `admin@demo.com` | — (plataforma) | **Super admin** | Panel `/admin`: crear, suspender y cambiar el plan de negocios, usuarios, registro público |
| `jhordan@demo.com` | Centro Profesional (plan Pro) | Propietario | Todo: equipo, suscripción, actividad |
| `andrea@demo.com` | Centro Profesional | Administrador | Sin acceso a equipo ni suscripción |
| `miguel@demo.com` | Centro Profesional | Staff | Sólo agenda, citas y clientes |
| `laura@demo.com` | Estudio Bella (plan Free) | Propietaria | Límites del plan Free y aislamiento entre negocios |
| `carolina@demo.com` | Psicóloga Carolina Vega | Propietaria | Negocio **suspendido** por el super admin |
| `pedro@demo.com` | — | Sin negocio | Cuenta registrada que no terminó el onboarding |

Páginas públicas de reserva: `/book/jhordan` y `/book/estudio-bella`.

Otros scripts: `npm run build` (typecheck + build de producción), `npm run preview`, `npm run lint` (oxlint), `npm run typecheck`.

## Stack

React 19 · TypeScript · Vite · React Router 8 · Tailwind CSS v4 · shadcn/ui (Radix) · Lucide ·
TanStack Query · Zod · date-fns · Recharts · Sonner.

## Estructura

```
src/
  app/            Router y providers globales (QueryClient, sesión, toasts)
  pages/          Una página por ruta (landing, auth, onboarding, dashboard/*, admin/*, booking)
  components/
    ui/           Componentes base shadcn/ui
    shared/       Componentes reutilizables (PageHeader, EmptyState, FormField, ConfirmDialog…)
    layout/       Layouts (auth, panel con sidebar y menú móvil)
  features/       Componentes y lógica por dominio: admin, appointments, calendar, clients, services,
                  schedule, dashboard, booking, reports, settings, onboarding, auth, landing
  hooks/          Hooks de datos (TanStack Query) y utilidades
  lib/
    api/          Cliente HTTP de la API (fetch con cookie de sesión y errores tipados)
    data/         Capa de datos: contrato (repository.ts) + implementación sobre la API
    auth/         Contrato de autenticación + implementación sobre la API
    availability.ts  Cálculo de horas disponibles (funciones puras)
    validations/  Esquemas Zod compartidos
    constants/    Estados, categorías, planes, zonas horarias
  types/          Modelos de dominio (User, Business, Client, Service, Appointment…)
```

`types/`, `lib/validations/`, `lib/availability.ts`, `lib/time.ts`, `lib/format.ts`, `lib/email/`,
`lib/constants/` y `lib/permissions.ts` también los usa la API: después de cambiarlos, ejecuta
`npm run sync:shared` en agenda-backend para copiarlos.

## Contraseñas y soporte

- **Las contraseñas las pone el super admin**: al crear un negocio, al agregar miembros a un equipo
  (sólo él puede) y al cambiársela a un usuario; el usuario la recibe por email y no puede cambiarla.
  "¿Olvidaste tu contraseña?" muestra el email de soporte.
- **Categorías**: los tipos de negocio están en la base de datos y el super admin los gestiona en
  `/admin/categories`. El negocio la elige al crearse y después sólo la cambia el super admin (ficha
  del negocio o modo soporte); en Configuración → Negocio el propietario la ve bloqueada.
- **Cambios de plan con aprobación**: el propietario solicita el plan en Configuración →
  Suscripción; el super admin recibe un email y la aprueba o rechaza desde el resumen del panel.
  El plan sólo se cambia desde el panel `/admin`, y el propietario siempre recibe un email.
- **Cédula**: sólo números (el campo no admite letras ni guiones; en Ecuador, 10 dígitos). En la
  página de reservas el cliente se identifica con su cédula; si ya es cliente del
  negocio no vuelve a escribir sus datos (y no se crean duplicados). En el panel, cédula y email
  son obligatorios al registrar un cliente, y el buscador encuentra por cédula.
- **Gestionar negocio** (panel `/admin` → negocio): el super admin abre el panel de cualquier
  negocio con permisos de propietario (servicios, horarios, citas, clientes, configuración). Un
  aviso arriba indica el modo soporte; todo queda en la actividad del negocio, incluidas las
  consultas a historias clínicas.

## ¿Quién crea los negocios?

Hay dos caminos, y el super admin decide cuáles están abiertos:

1. **Registro propio** (`/register` → onboarding de 6 pasos): el profesional crea su cuenta y su
   negocio, con plan Free. Se puede cerrar desde `/admin/settings` → "Registro público abierto";
   con el registro cerrado, `/register` muestra un aviso y el backend rechaza las altas.
   **En producción está cerrado**: las contraseñas las pone siempre el super admin.
2. **Alta por el super admin** (`/admin/businesses` → "Nuevo negocio"): crea el negocio, su
   propietario (cuenta nueva con contraseña temporal, o una existente sin negocio) y el plan.
   El negocio nace con horario y un servicio sugerido, y el propietario recibe un email con sus
   datos de acceso y el enlace de su página de reservas.

Jerarquía de roles:

```
Super admin (plataforma)  →  crea / suspende negocios, cambia planes, gestiona cuentas
  └─ Negocio
       ├─ Propietario  →  todo su negocio: equipo, configuración, suscripción
       ├─ Administrador →  operación diaria y reportes
       └─ Staff         →  agenda, citas y clientes
```

## Panel de plataforma (super admin)

- **Resumen**: negocios activos/suspendidos, ingresos recurrentes (MRR), usuarios, citas y
  reservas online del mes, nuevos negocios por mes y distribución por plan.
- **Negocios**: búsqueda y filtros por plan/estado; ficha con uso del plan, equipo, actividad,
  cambio de plan, suspender/reactivar y restablecer la contraseña del propietario.
  Un negocio suspendido no puede usar el panel (ve un aviso con el email de soporte) y su
  página pública deja de estar disponible.
- **Usuarios**: todas las cuentas con su negocio y rol; desactivar/reactivar acceso y
  restablecer contraseña (contraseña temporal enviada por email).
- **Planes**: precios, límites, negocios e ingresos por plan.
- **Actividad**: auditoría del super admin o de toda la plataforma, y todos los emails enviados.
- **Configuración**: registro público abierto/cerrado y email de soporte.

Cada operación de plataforma comprueba en la API que la sesión es de un super admin.

## Funcionalidades

- **Multi-tenant con roles** (owner / admin / staff) en `business_users`. Los permisos están en
  `src/lib/permissions.ts` y se aplican en la interfaz **y** en la API.
- **Límites por plan** (Free: 20 citas/mes, 50 clientes, 1 usuario; Pro: 3 usuarios; Business:
  ilimitado). Los aplica la API; al alcanzarlos se ofrece "Actualizar a PRO". El cambio de plan
  aún no tiene cobro (pagos pendientes).
- **Emails** (registro, recuperación, invitación, reserva, confirmación, modificación,
  cancelación, recordatorio): plantillas en `src/lib/email/templates.ts`. La API los envía por
  Gmail y quedan en la bandeja de salida de Configuración → Notificaciones.
- **Auditoría**: quién hizo qué y cuándo (Configuración → Actividad).
- **Horas de reserva según la duración del servicio**: un servicio de 1 h se ofrece a las
  08:00, 09:00, 10:00… (nunca a las 08:30); la reserva se rechaza en el backend si la hora no
  está en esa cuadrícula. Se puede cambiar a "cada X minutos" en Configuración → Agenda.
- **Precio visible u oculto por servicio**: interruptor "Mostrar el precio a los clientes". Si está
  apagado, o el precio es 0, la página pública y los emails al cliente no muestran ningún precio.
  El profesional siempre ve y edita el precio real. Se respeta en la página pública y en los emails al cliente;
  el profesional siempre ve y edita el precio real.
- **Historia clínica** (negocios de salud; se activa en Configuración → Negocio): pestaña en la
  ficha del cliente con antecedentes (cédula, alergias, enfermedades, medicación, consentimiento
  informado…) y evoluciones por consulta con el **formato de cada especialidad** (plantillas):
  atención médica (signos vitales, examen físico, diagnósticos CIE-10, receta, descargo de
  responsabilidad), psicología, odontología, nutrición con IMC automático, fisioterapia,
  fonoaudiología, medicina estética, evolución general y nota libre. Se propone el formato de la
  última evolución del paciente o el recomendado para la especialidad; lo escrito en cada formato se
  conserva al cambiar de uno a otro. Formulario y vista en `src/features/clinical/`
  (`clinical-field-input.tsx`, `clinical-note-content.tsx`).
  - **Odontograma** (se copia el último y se actualiza), **mapa del cuerpo** para lesiones o dolor
    y **escalas PHQ-9 y GAD-7** con puntaje y aviso de riesgo.
  - **Gráfico de evolución** en la ficha: peso, IMC, dolor, puntajes… a lo largo de las consultas.
  - **Formatos propios** (Pro y Business): Configuración → Negocio → Gestionar formatos, editor con
    vista previa; duplicar uno de la plataforma o crear desde cero. Cada servicio puede tener su
    formato, que se propone al registrar la evolución de esa cita.
  - **Archivos** (Pro y Business): radiografías, exámenes, fotos o PDF en la ficha del paciente. Atajo "Registrar evolución" desde el detalle de la cita y vista para imprimir o
  guardar en PDF (para el archivo del profesional). Acceso: el propietario, los miembros que él
  autoriza en Equipo y el super admin en "Gestionar negocio"; las evoluciones no se editan ni se borran (se añaden
  aclaraciones); cada acceso queda en la auditoría; un paciente con historia no se puede eliminar.
- **Ubicación del local**: en Configuración → Negocio se marca la puerta del local en un mapa. La
  página de reservas muestra el mapa con "Cómo llegar" (salvo en citas a domicilio), y la
  confirmación, la pantalla final y los emails llevan a ese punto exacto en Google Maps.
- **Citas a domicilio**: cada servicio puede ser "en el local", "a domicilio" o ambos, con un
  recargo opcional. Al reservar, el cliente marca su **ubicación exacta en un mapa** (toque, pin
  arrastrable, "Usar mi ubicación" o buscador de direcciones) y añade una referencia. En la agenda
  la cita lleva un icono de casa y el botón "Cómo llegar" (Google Maps).
- **Mapas**: mapa vectorial con MapLibre GL y el estilo "Liberty" de OpenFreeMap (datos de
  OpenStreetMap; gratis, sin clave de API ni límite de visitas, uso comercial permitido). Se carga
  bajo demanda sólo en las pantallas con mapa. La búsqueda de direcciones usa Nominatim (gratis,
  sin clave, pero con poco tráfico permitido: en producción conviene un proveedor de geocodificación).
- **Anticipación mínima de 24 h para reservas online**: los clientes no pueden reservar con
  menos de un día de antelación (el negocio puede exigir más, nunca menos; también se valida en
  el backend). El profesional, desde su panel, puede agendar a cualquier hora.
- **WhatsApp**: el negocio escribe al cliente desde el detalle de la cita o su ficha, y el
  cliente escribe al negocio desde la página de reservas ("Escríbenos por WhatsApp", p. ej. para
  una cita con menos de 24 h). Abre la conversación con un mensaje ya escrito (enlace `wa.me`, sin API ni coste). Los números sin
  prefijo internacional toman el del país del negocio.
- Onboarding en 6 pasos, agenda día/semana/mes, clientes (con buscador en "Nueva cita"),
  servicios, horarios partidos, bloqueos, página pública de reservas sin registro, reportes y configuración.

## Arquitectura

- **Capa de datos.** Los componentes nunca llaman a `fetch`: usan hooks (`src/hooks/queries`) que
  llaman a `data.*` (`src/lib/data/index.ts`), implementado en `lib/data/api-repository.ts` sobre la
  API. Las claves de caché de TanStack Query incluyen el `businessId`.
- **Sesión** en una cookie `httpOnly` que gestiona la API: el frontend nunca ve el token. Si la API
  responde 401 (sesión caducada o cerrada en otro dispositivo), la app vuelve al login.
- **Disponibilidad como lógica pura.** `lib/availability.ts` combina horario semanal (con
  intervalos partidos), citas activas, bloqueos, duración del servicio y anticipación
  mínima/máxima. La API usa la misma función para validar la reserva al confirmarla.
- **Fechas en la zona horaria del negocio** (`America/Guayaquil` por defecto): fechas
  `YYYY-MM-DD` y horas `HH:mm`, independientes de la zona del navegador.

## Despliegue

En Vercel, como proyecto Vite (build `npm run build`, salida `dist/`). `vercel.json` incluye la
reescritura SPA para que las rutas profundas (`/dashboard/...`, `/book/...`) funcionen y las
cabeceras de seguridad: la política de contenido (CSP) sólo deja cargar código de este dominio y
de Cloudflare (CAPTCHA de la página de reservas), conectarse a los mapas (OpenFreeMap), al
buscador de direcciones (Nominatim) y a Supabase (los archivos de la historia clínica se suben
directo desde el navegador), y nadie puede mostrar la web dentro de otra (clickjacking).
Si se añade un servicio externo nuevo, hay que permitirlo ahí.

El CAPTCHA (Cloudflare Turnstile) lo activa la API: con sus claves configuradas, el perfil público
trae `captchaSiteKey` y la página de reservas carga el widget (`src/features/booking/use-captcha.ts`).

La API es otro proyecto de Vercel (ver agenda-backend). `middleware.ts` (Routing Middleware de
Vercel) reenvía `/api/*` a esa API: el navegador sólo habla con el dominio del frontend, así que la
cookie de sesión es propia y no hace falta CORS. Como Vercel reemplaza la IP del visitante al pasar
por un proxy, el middleware la envía aparte firmada con `PROXY_SECRET` para que los límites
anti-abuso de la API sean por visitante.

Variables de entorno del proyecto en Vercel (no llevan el prefijo `VITE_`: sólo las lee el
middleware, nunca llegan al navegador):

| Variable | Valor |
| --- | --- |
| `API_URL` | URL de la API, p. ej. `https://agenda-backend.vercel.app` |
| `PROXY_SECRET` | El mismo valor que en la API |

En local no se usa el middleware: el proxy de Vite (`vite.config.ts`) hace lo mismo.
