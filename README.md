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

Para probar sin tocar producción, arranca la API con `npm run dev:local` (base de datos en tu equipo
con los datos demo). Se trabaja en la rama `dev` y se publica fusionando en `main`: Vercel sólo
despliega `main` (ver "Ramas" en el README de agenda-backend).

Con los datos demo (`npm run dev:local` o `npm run db:seed` en la API), todas las cuentas usan la contraseña
`demo1234` (varias agendas: `ricardo@demo.com`, `valeria@demo.com` con el rol Profesional y
`elena@demo.com` en recepción, en Clínica Dental Sonrisa):

| Cuenta | Negocio | Rol | Para probar |
| --- | --- | --- | --- |
| `admin@demo.com` | — (plataforma) | **Super admin** | Panel `/admin`: crear, suspender y cambiar el plan de negocios, usuarios, registro público |
| `jhordan@demo.com` | Centro Profesional (plan Pro) | Propietario | Todo: negocio, colores, equipo, actividad |
| `andrea@demo.com` | Centro Profesional | Administrador | Sin acceso a la configuración del negocio ni al equipo |
| `miguel@demo.com` | Centro Profesional | Staff | Sólo agenda, citas y clientes |
| `laura@demo.com` | Estudio Bella (plan Free) | Propietaria | Límites del plan Free y aislamiento entre negocios |
| `carolina@demo.com` | Psicóloga Carolina Vega | Propietaria | Negocio **suspendido** por el super admin |
| `pedro@demo.com` | — | Sin negocio | Cuenta registrada que no terminó el onboarding |

Páginas públicas de reserva: `/book/jhordan` y `/book/estudio-bella`.

Otros scripts: `npm run build` (typecheck + build de producción), `npm run preview`, `npm run lint` (oxlint), `npm run typecheck`.

## Analítica

Visitas por página con Vercel Web Analytics (`src/app/page-analytics.tsx`, sin cookies): se ven en
Vercel → agenda-front → Analytics. Sólo se activa en la web publicada (no en local). Antes de enviar
cada visita se cambian los identificadores de la ruta por `[id]`, los tokens de los enlaces privados
(`/pago/…`, `/cita/…`) por `[token]` y se quitan los parámetros de la URL,
así a Vercel no llega a qué cliente o negocio se entró. El plan Hobby incluye 50.000 visitas al mes
(entre todos los proyectos); al pasarlas, Vercel deja de contar hasta el ciclo siguiente, la web sigue
igual. `vercel.json` excluye `/_vercel/` de la reescritura a `index.html`.

## Stack

React 19 · TypeScript · Vite · React Router 8 · Tailwind CSS v4 · shadcn/ui (Radix) · Lucide ·
TanStack Query · Zod · date-fns · Recharts · Sonner · MapLibre · Sora · read-excel-file (sólo en la
pantalla de importar pacientes, con la versión fija).

## Diseño

Identidad de "agenda de consultorio en azul y lila pastel" (tokens en `src/index.css`, la misma que
el beta):

- **Azul consultorio** `#4A6CB0` (`--ink`): acciones, títulos y lo activo. **Azul pastel** `#E8EEFB` y
  **bruma** `#F5F7FC`: superficies y fondos. **Lila pastel** `#DDD4F8` (clases `marker` y
  `marker-sweep`): marca lo elegido o lo nuevo; su tono suave `#EFEBFC` viste insignias y botones
  secundarios.
- **Icono** `public/icon-calendar.svg` (y `BrandMark`), con versiones PNG de 32, 192 y 180 px. Cada
  icono nuevo lleva otro nombre de archivo y `src/main.tsx` lo vuelve a declarar con `?v=` para que
  los navegadores no sigan mostrando el anterior.
- **Colores de cada negocio** (Configuración → Colores, cualquier plan; los cambia sólo el
  propietario, con el permiso `business.manage`, o el super admin en modo soporte: un administrador
  no ve la pestaña): una paleta lista (Agenda360, Eucalipto, Lavanda, Rosa, Turquesa, Coral, Oliva, Grafito) o
  dos colores a elección (principal y resaltado), con vista previa. Se aplican a su panel, a su
  página de reservas y a la lámina del QR; la portada, el login y el panel de plataforma siguen con
  los de Agenda360. De los dos colores sale toda la paleta (fondos, bordes, textos, gráficos) en
  `src/lib/brand-theme.ts`, calculada en OKLCH; si el principal es muy claro para texto blanco se
  oscurece solo hasta un contraste de 4,5:1 (y el resaltado se aclara si hace falta). Se guardan en
  `business.brandColors` (columna `brand_colors`, migración 018; null = los de Agenda360) y los
  aplica `BrandThemeProvider`.
- **Modo oscuro (spec 019).** Cada persona elige su modo en Configuración → Perfil (también en la
  Configuración de /admin): «Claro», «Oscuro» o «Automático», que sigue al celular o la computadora y
  es el valor por defecto.
  - **Dónde se guarda:** en la cuenta (`users.theme_mode`, migración 044 del backend). Llega con
    `GET /auth/session` y se cambia con `PUT /auth/theme-mode`, que deja su entrada en la actividad.
    El aparato recuerda la última elección (`localStorage["agenda360:modo-pantalla"]`), pero sólo
    para el arranque y para las pantallas de antes de iniciar sesión.
  - **Las páginas de los pacientes** (`/book`, `/pago` y `/cita`) siguen siempre al aparato.
  - **Sin destello al abrir:** `public/theme-boot.js` pone la clase `dark` en `<html>` antes de
    pintar. Es un archivo aparte porque el CSP no deja scripts dentro del HTML.
  - **Los colores:** `src/features/theme/` aplica el modo y escucha los cambios del aparato.
    `resolveBrandPalette` devuelve `{ light, dark }`: la oscura sale de los mismos dos colores y la
    inyecta `BrandThemeProvider` en un `<style>`. La variante `dark:` y los tokens oscuros sólo
    valen en pantalla, así que lo impreso sale claro.
  - **Siguen claros a propósito:** los emails, el QR y la placa del logo del negocio.
  - **El contraste:** `npm run check:contrast` mide la paleta de Agenda360, cada paleta de la lista y
    cuatro colores extremos, en los dos modos. Exige 4,5:1 en los textos y 3:1 en lo demás, y falla si
    algo no llega.
- **Tipografía** Sora; las horas, grandes, gruesas y con cifras tabulares.
- **Pestañas de agenda** (`TabsList variant="folder"`): el menú lateral, los pasos de la reserva y
  las pestañas de Configuración y de la ficha del cliente.
- **Inicio**: "Tu siguiente cita", "Tu día" en una franja horizontal, "Lo que queda de hoy", la
  semana en barras, las citas por confirmar y el enlace de reservas. Las cifras van en franjas
  (`MetricStrip`) en Reportes, la ficha del cliente y el panel de plataforma.
- Los emails usan los mismos colores (`src/lib/email/layout.ts`).

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
                  schedule, dashboard, booking, reports, settings, onboarding, auth, landing, push,
                  notices (la campana de avisos)
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
`lib/constants/`, `lib/notices.ts` y `lib/permissions.ts` también los usa la API: después de cambiarlos, ejecuta
`npm run sync:shared` en agenda-backend para copiarlos.

## Contraseñas y soporte

- **Las contraseñas las pone el super admin**: al crear un negocio, al agregar miembros a un equipo
  (sólo él puede) y al cambiársela a un usuario; el usuario la recibe por email y no puede cambiarla.
  "¿Olvidaste tu contraseña?" muestra el email de soporte.
- **Cambiar el email de la cuenta** (Configuración → Perfil) pide la contraseña actual.
- **Categorías**: los tipos de negocio están en la base de datos y el super admin los gestiona en
  `/admin/categories`. El negocio la elige al crearse y después sólo la cambia el super admin (ficha
  del negocio o modo soporte); en Configuración → Negocio el propietario la ve bloqueada.
- **Cambios de plan**: los negocios no ven planes ni precios (ya no hay pestaña Configuración →
  Suscripción). El plan lo cambia el super admin en la ficha del negocio en `/admin`, y el
  propietario siempre recibe un email. Las solicitudes pendientes, si las hubiera (la API aún las
  acepta), aparecen en el resumen del panel para aprobarlas o rechazarlas.
- **Cédula**: sólo números (el campo no admite letras ni guiones; en Ecuador, 10 dígitos). En la
  página de reservas el paciente escribe siempre cédula, nombre, email y teléfono: la página no
  dice si la cédula ya es de un cliente del negocio. Si lo es, la reserva se une a su ficha cuando
  coinciden el email o el teléfono (no se crean duplicados); si no coinciden, se muestra "No pudimos
  confirmar tus datos…" con el WhatsApp del negocio. Con "Recordar mis datos en este dispositivo"
  (marcado por defecto) sus datos quedan en ese navegador (`localStorage`,
  `src/features/booking/saved-contact.ts`) y la próxima vez ya están puestos, con "Olvidar mis
  datos". Si se pierde la respuesta y el paciente vuelve a confirmar, la confirmación no repite los
  datos para pagar: dice "Revisa tu email para pagar". Los topes del día (reservas online, clientes
  nuevos), el CAPTCHA y los datos que no coinciden se muestran junto al botón de reservar, con el
  WhatsApp del negocio. En el panel, los datos obligatorios del cliente dependen del negocio (por
  defecto, cédula y email; ver «Datos obligatorios del paciente»), y el buscador encuentra por cédula.
- **Gestionar negocio** (panel `/admin` → negocio): el super admin abre el panel de cualquier
  negocio con permisos de propietario (servicios, horarios, citas, clientes, configuración). Un
  aviso arriba indica el modo soporte; lo que crea o cambia queda en la actividad del negocio con su
  nombre ("Nombre (Super admin)"). Lo que sólo consulta (también las historias clínicas y sus
  archivos) no se registra.

## ¿Quién crea los negocios?

Hay dos caminos, y el super admin decide cuáles están abiertos:

1. **Registro propio** (`/register` → onboarding de 6 pasos): el profesional crea su cuenta y su
   negocio, con plan Free. Se puede cerrar desde `/admin/settings` → "Registro público abierto";
   con el registro cerrado, `/register` muestra un aviso y el backend rechaza las altas.
   **En producción está cerrado**: las contraseñas las pone siempre el super admin.
2. **Alta por el super admin** (`/admin/businesses` → "Nuevo negocio"): datos del negocio con su
   descripción, sus servicios (nombre, minutos y precio; se propone el del tipo de negocio), su
   horario semanal (varios intervalos por día) y el plan. **Sin propietario**: su página de
   reservas funciona desde ya y la cuenta se agrega después en la ficha del negocio ("Agregar
   propietario": cuenta nueva, o una existente sin negocio, con la contraseña que elige el super
   admin). Le llega un email con su acceso; si el negocio tiene una sola agenda, pasa a ser la suya.

Jerarquía de roles:

```
Super admin (plataforma)  →  crea / suspende negocios, cambia planes, gestiona cuentas
  └─ Negocio
       ├─ Propietario  →  todo su negocio: equipo, configuración, colores
       ├─ Administrador →  operación diaria y reportes
       └─ Staff         →  agenda, citas y clientes
```

## Panel de plataforma (super admin)

**Equipo de la plataforma** (Configuración del panel /admin): el super admin principal agrega a
otros super admins para que le ayuden con el soporte (nombre, email y la contraseña que elige; les
llega un email con sus datos). Tienen los mismos permisos de plataforma salvo gestionar a otros
super admins: sólo el principal los agrega, les cambia la contraseña o les quita el acceso, y nadie
puede tocar la cuenta del principal ni la propia desde ahí. La lista muestra quién tiene la
verificación en dos pasos y su último acceso; todo lo que hace cada uno queda en la actividad con su
nombre ("Nombre (Super admin)").

**Verificación en dos pasos obligatoria**: con datos reales, un super admin sin ella inicia sesión pero
ve la pantalla "Activa la verificación en dos pasos" (`components/layout/two-factor-required-screen.tsx`)
en lugar del panel; la API responde `two_factor_required` en `/admin` y en el modo soporte hasta que la
active con una app de autenticación. Después, el panel aparece solo.

- **Resumen**: negocios activos de los que hay y su reparto por plan (sólo los activos), el
  crecimiento del mes, la salud del sistema (emails de hoy, el **cupo de Gmail**, el cron, la copia de
  seguridad y los intentos fallidos) y los negocios para vender («Cerca del límite» cuenta los
  pacientes igual que el tope del plan). No hay ingresos ni MRR: aún no hay cobro.
  - **Cupo de Gmail** (spec 015, `features/admin/health-section.tsx`): los envíos de las últimas 24 h
    frente al cupo de la cuenta, en ámbar desde el 80 % y en rojo al llegar al límite de los emails
    al paciente (el cupo menos la reserva del equipo), y cuántos esperan en la cola, al paciente y al
    negocio. Lo que no cabe no se pierde: sale en cuanto hay cupo (primero el equipo, después el
    paciente y al final las copias al profesional y los avisos al negocio).
- **Negocios**: búsqueda y filtros por plan/estado; ficha con uso del plan, desde cuándo está en su
  plan («En Pro desde el 3 oct»: sin cobro, no hay fecha de renovación), equipo, actividad, cambio
  de plan, suspender/reactivar y restablecer la contraseña del propietario.
  Un negocio suspendido no puede usar el panel (ve un aviso con el email de soporte) y su
  página pública deja de estar disponible.
- **Datos obligatorios del paciente** (ficha del negocio, `features/admin/client-required-fields-card.tsx`):
  un interruptor por dato (Cédula, Email, Teléfono, Dirección; el Nombre siempre) decide qué pide el
  panel de ese negocio al crear o editar un paciente. Por defecto, cédula y email, como hasta ahora.
  Sólo el super admin lo cambia (el negocio no lo ve en su configuración) y queda en la actividad del
  negocio. La reserva online no cambia: pide siempre cédula, nombre, email y teléfono. El formulario
  del paciente (`client-form-dialog.tsx`, también «+ Nuevo» en la nueva cita y el modo soporte) usa
  la configuración del negocio (`Business.clientRequiredFields`): «(opcional)» sólo en los que no lo
  son, y valida con `clientSchemaFor` (`lib/validations/client.ts`), el mismo esquema que la API. A
  un paciente antiguo al que le falta un dato que ahora es obligatorio hay que completárselo para
  guardar su ficha o sus notas.
- **Analítica** (spec 016, `pages/admin/admin-analytics-page.tsx` y `features/admin/analytics/`): los
  últimos 30 o 90 días frente al periodo anterior, en cuatro pestañas (la pestaña y el periodo van en
  la dirección, `?pestana=` y `?dias=`):
  - **Comparar:** todos los negocios en una tabla ordenable (tocando la columna; otra vez, al revés),
    con filtros por tipo, plan y estado (por defecto, los activos), búsqueda y «Exportar CSV» con lo que
    se ve (se arma en el navegador). Cada tasa dice la de su tipo («tipo 12 %»), en verde o en rojo con
    su flecha si es muy distinta; con menos de 10 citas, «pocos datos». A 390 px la tabla se desplaza
    dentro de su recuadro, con el negocio fijo a la izquierda.
  - **Por tipo de negocio:** el valor típico (la mediana) de cada tipo y sus días y horas de más demanda.
  - **Salud y ventas:** cuántos están sanos, en riesgo o críticos; «En riesgo» con los motivos y el
    contacto del propietario (llamar, WhatsApp con el saludo escrito y email) y «Listos para subir de
    plan» con su motivo. «Negocios para vender» del Resumen sigue igual.
  - **Uso y valor:** los totales de la plataforma con «Copiar» para ventas, la adopción de cada función,
    qué usa cada negocio y el valor del periodo (con las inasistencias antes y después).

  La ficha del negocio suma «Frente a su tipo» (`features/admin/analytics/versus-type-card.tsx`), con
  su salud. Las cifras son la foto que prepara el cron cada mañana (la API no calcula nada al abrir la
  página): arriba dice «Datos de hoy a las 06:10» y, sin foto todavía, «Las cifras se preparan cada
  mañana». Sin datos de pacientes. La beta no la lleva.
- **Usuarios**: todas las cuentas con su negocio y rol; desactivar/reactivar acceso y
  restablecer contraseña (contraseña temporal enviada por email).
- **Planes**: los límites de cada plan y cuántos negocios y agendas activas tiene (los precios se
  acuerdan con cada negocio: no hay ingresos por plan).
- **Actividad**: auditoría del super admin o de toda la plataforma, y todos los emails enviados.
- **Configuración**: registro público abierto/cerrado y email de soporte.

Cada operación de plataforma comprueba en la API que la sesión es de un super admin.

## Funcionalidades

- **Multi-tenant con roles** (Propietario, Administrador, Recepción y Profesional) en
  `business_users`. Los permisos están en `src/lib/permissions.ts` y se aplican en la interfaz **y**
  en la API; el rol Profesional sólo ve su propia agenda (la API se la filtra) y, si el negocio elige
  «sólo sus pacientes», sólo sus pacientes. Una reserva online con la cédula de un paciente que ya
  existía no se los da: ve la cita con el nombre (el cliente llega con `restricted`), pero no su ficha
  ni su historia hasta que recepción, un administrador o el propietario la confirme o la gestione.
  En la actividad del negocio, los eventos de la historia clínica sólo los ve quien tiene acceso clínico.
- **Varias agendas** (plan Business): página Profesionales (`features/professionals`), horario y
  bloqueos por profesional, calendario con filtro y una columna por profesional en la vista Día,
  "¿Con quién?" en la página de reservas (o "el primero disponible"), llegada del paciente en el
  detalle de la cita y reportes por profesional (citas, asistencia, cobrado y ocupación).
  **Free y Pro son cuentas individuales** (`multipleAgendas` en `plans.ts`): sin la sección
  Profesionales ni el rol Profesional; la especialidad y el enlace de videollamada de su única agenda
  se editan en Configuración → Perfil ("Tu agenda en la página de reservas").
  `useAgendas()` dice qué agendas puede elegir el usuario y si hay varias (si hay una sola, la
  interfaz es la de siempre).
- **Límites por plan** (Free: 20 citas/mes, 50 clientes, 1 usuario; Pro: 3 usuarios; ambos 1 agenda;
  Business: ilimitado y las agendas contratadas). Los aplica la API. Los planes y precios no se
  muestran a los negocios: al llegar a un límite se invita a escribir a soporte.
- **Emails** (registro, recuperación, invitación, reserva, confirmación, modificación,
  cancelación, recordatorio): plantillas en `src/lib/email/templates.ts`. La API los envía por
  Gmail y quedan en la bandeja de salida de Configuración → Notificaciones.
- **Auditoría**: quién hizo qué y cuándo (Configuración → Actividad).
- **Horas de reserva según la duración del servicio**: un servicio de 1 h se ofrece a las
  08:00, 09:00, 10:00… (nunca a las 08:30); la reserva se rechaza en el backend si la hora no
  está en esa cuadrícula. Se puede cambiar a "cada X minutos" en Configuración → Agenda.
- **El precio de cada servicio, a elección**: "Mostrar el precio", "Gratis" (precio 0; los clientes
  ven «Gratis») o "No mostrar" (precio a consultar: ni precio ni «Gratis» en la página pública y en
  los emails al cliente). El profesional siempre ve y edita el precio real.
- **Historia clínica** (negocios de salud; se activa en Configuración → Negocio): pestaña en la
  ficha del cliente con antecedentes (cédula, alergias, enfermedades, medicación, consentimiento
  informado…) y evoluciones por consulta con el **formato de cada especialidad** (plantillas):
  atención médica (signos vitales, examen físico, diagnósticos CIE-10, receta, descargo de
  responsabilidad), psicología, odontología, nutrición con IMC automático, fisioterapia,
  fonoaudiología, medicina estética, evolución general y nota libre. Se propone el **formato de tu
  negocio**; lo escrito en cada formato se
  conserva al cambiar de uno a otro. Formulario y vista en `src/features/clinical/`
  (`clinical-field-input.tsx`, `clinical-note-content.tsx`).
  - **Odontograma** (se copia el último y se actualiza), **mapa del cuerpo** para lesiones o dolor
    y **escalas PHQ-9 y GAD-7** con puntaje y aviso de riesgo.
  - **Gráfico de evolución** en la ficha: peso, IMC, dolor, puntajes… a lo largo de las consultas.
  - **Formato de tu negocio** (cualquier plan): el que se propone en cada evolución nueva. Se elige
    con "Usar en todo el negocio" en la página de formatos (o al crear un formato propio); si no se
    elige ninguno, es el recomendado para la especialidad. La página de formatos lo muestra arriba
    (con la marca "Creado por ti" si es propio), la historia del paciente lo indica sobre las
    evoluciones con un botón "Cambiar formato", Configuración → Negocio dice cuál es y cada
    evolución muestra con qué formato se escribió. Si se desactiva el formato elegido, se vuelve al
    recomendado.
  - **Formatos propios** (Pro y Business): Configuración → Negocio → Gestionar formatos, editor con
    vista previa; duplicar uno de la plataforma o crear desde cero. Los servicios no tienen formato
    propio: en todas las citas se propone el formato de tu negocio.
  - **Archivos** (Pro y Business): radiografías, exámenes, fotos o PDF en la ficha del paciente. Atajo "Registrar evolución" desde el detalle de la cita y vista para imprimir o
  guardar en PDF (para el archivo del profesional). Acceso: el propietario, los miembros que él
  autoriza en Equipo y el super admin en "Gestionar negocio"; las evoluciones no se editan ni se borran (se añaden
  aclaraciones); cada acceso queda en la auditoría; un paciente con historia no se puede eliminar.
- **Ubicación del local**: en Configuración → Negocio se marca la puerta del local en un mapa. La
  página de reservas muestra el mapa con "Cómo llegar" (salvo en citas a domicilio), y la
  confirmación, la pantalla final y los emails llevan a ese punto exacto en Google Maps.
- **Modalidades: en el local, a domicilio y virtual**: cada servicio admite una o varias (con varias,
  el cliente elige al reservar). Lo **virtual** es por videollamada con la sala fija de cada
  profesional (Profesionales → Editar → "Enlace de videollamada": Meet, Zoom o Teams, con https://):
  el enlace llega en la confirmación, en los emails y en el aviso por WhatsApp; en la agenda la
  cita lleva un icono de cámara y el detalle, "Entrar a la videollamada".
- **Mover citas arrastrándolas** (vistas Día y Semana, `features/calendar/use-appointment-drag.ts`):
  con el ratón o, en el móvil (en el Día de un profesional), manteniendo el dedo medio segundo. La sombra muestra dónde caerá
  (cada 15 min) y, en rojo, por qué no se puede (hora pasada, ocupada, profesional inactivo o que no
  atiende el servicio); en la vista Día con varias agendas se puede pasar a otro profesional. Sólo
  citas pendientes o confirmadas. La agenda la muestra al momento en su sitio nuevo y la guarda a
  los 5 s (`useMoveAppointment`): "Deshacer" antes no avisa al paciente; después llegan el email de
  cambio y el aviso de WhatsApp, como al editarla.
- **Móvil en tarjetas** (menos de 768 px, `hooks/use-media-query.ts`): la Semana de la agenda y el
  Día con todos los profesionales se ven como tarjetas agrupadas por día
  (`features/calendar/agenda-list-view.tsx`); el Día de un profesional sigue en la rejilla por horas
  (huecos libres y arrastrar). También van en tarjetas Clientes (sin el botón "Lista"), el historial
  de la ficha del cliente, Reportes ("Por profesional" y "Ver como tabla"), Negocios, Usuarios y
  Categorías del admin, y los procedimientos y diagnósticos de la historia clínica. Las pestañas de
  Configuración van en cuadrícula y "Tu día" cabe entero (sin deslizar). En pantallas anchas, las
  tablas y la rejilla de siempre; al imprimir, siempre las tablas.
- **Pago por transferencia**: cada agenda puede tener **hasta 3 cuentas bancarias**
  (`features/professionals/bank-account-fields.tsx`: «Agregar otra cuenta», «Quitar» y subir o bajar;
  la primera es la principal; en Business, en Profesionales → Editar, y la tarjeta dice el banco o
  «2 cuentas bancarias»; en Free y Pro, en Configuración → Perfil). Al reservar un servicio con
  precio, la pantalla final muestra **todas** las cuentas, una debajo de otra, y el monto
  (`features/payments/bank-transfer-card.tsx`; con varias, «Transfiere a cualquiera de estas
  cuentas»), cada una con sus botones de copiar, y deja subir el comprobante (foto o PDF,
  10 MB, directo a Supabase Storage con URL firmada; las fotos se reducen antes en el navegador,
  `prepareReceipt` en `lib/upload.ts`) o mandarlo por WhatsApp. Uno por cita: enviado, en su lugar sale
  «Comprobante enviado» en verde (y, si se equivocó de archivo, el enlace a WhatsApp). Los
  comprobantes se borran 3 meses después de la cita (cron del backend). El enlace privado
  `/pago/:token` (`pages/payment-page.tsx`, sin sesión, también con todas las cuentas) llega en el
  email de la reserva (que lista todas) y en el aviso de confirmación por WhatsApp. En la ficha de la
  cita (`appointment-payment.tsx`): ver los comprobantes, "Marcar como pagada", copiar el enlace de
  pago o enviar por WhatsApp los datos de todas las cuentas con el enlace; la agenda marca
  "Comprobante" en las citas por revisar y `?appointment=<id>` en el calendario abre su ficha
  (enlace del email al negocio).
- **«Tu cita»: el paciente confirma o cancela desde el email** (spec 010): los emails de una cita
  activa llevan el enlace privado de cada persona a `/cita/:token` (`pages/appointment-page.tsx` y
  `features/patient-appointment/`, sin sesión y con los colores del negocio; el del paciente principal
  usa el mismo token que `/pago/:token`). Ahí ve el servicio, la fecha, la hora, el profesional, el
  lugar y el contacto del negocio (nada de sus datos), pulsa «Confirmo que voy» (una marca aparte: no
  cambia el estado; con `?confirmar=1`, el botón del recordatorio, se confirma al abrir y el parámetro
  se quita de la dirección) y, si el negocio lo permite y aún está en plazo, «Cancelar mi cita» (pide
  confirmarlo y ofrece «Elegir otra hora»). Si no, el WhatsApp con el aviso ya escrito y «Llamar».
  Sólo el principal cancela y paga; las otras personas de la sesión sólo confirman. La página de pago
  enlaza a «Tu cita». En el panel, la marca «Confirmó el paciente» (`client-confirmed-badge.tsx`) va
  en el bloque de la agenda (icono y lector de pantalla), la lista del celular, la ficha (con la hora
  y, con varias personas, la de cada una) y el Inicio («Confirmó»). Configuración → Agenda explica
  que «Permitir cancelaciones» y la antelación valen también para «Tu cita» y avisa si el
  recordatorio sale cuando ya no se puede cancelar. Un panel con un backend anterior trata
  `clientConfirmations` como vacía.
- **Citas que se repiten** (spec 011): en «Nueva cita», «Repetir» (`series-fields.tsx`) con cada
  cuánto (cada semana, cada 2 semanas o cada mes) y cuántas citas (de 2 a 24, 8 por defecto); el
  Estado sólo ofrece Pendiente o Confirmada y el botón pasa a «Revisar fechas». La lista de fechas
  (`series-review.tsx`) reemplaza al formulario en el mismo diálogo: la calcula la API con
  `lib/appointment-series.ts` (compartido) y marca cada fecha con su texto (otra cita, bloqueo, no
  atiende, fuera de horario o el cupo del plan). En las marcadas, «Otra hora» (las horas libres de ese
  día), «Agendar igual» (bloqueo, día sin atención o fuera del horario; desmarcada al empezar) y
  «Quitar»; el cupo se recalcula al momento. «Crear N citas» avisa cuántas se crearon y cuáles no. La
  ficha dice «Cita 3 de 8 · cada semana» y ofrece «Cancelar ésta y las siguientes», con la casilla
  «Avisar al paciente» y el WhatsApp ya escrito con todas las fechas. Un panel con un backend
  anterior trata `series` como null.
- **Logos y fotos**: `ImageUploadField` reduce la imagen en el navegador (WebP, 512–800 px) y la sube
  al bucket público `imagenes` de Supabase Storage (`hooks/queries/use-images.ts`, `lib/upload.ts`);
  el formulario guarda su dirección pública, no la imagen.
- **Citas a domicilio**: con un recargo opcional por servicio. Al reservar, el cliente marca su **ubicación exacta en un mapa** (toque, pin
  arrastrable, "Usar mi ubicación" o buscador de direcciones) y añade una referencia. En la agenda
  la cita lleva un icono de casa y el botón "Cómo llegar" (Google Maps).
- **Mapas**: mapa vectorial con MapLibre GL y el estilo "Liberty" de OpenFreeMap (datos de
  OpenStreetMap; gratis, sin clave de API ni límite de visitas, uso comercial permitido). Se carga
  bajo demanda sólo en las pantallas con mapa. La búsqueda de direcciones usa Nominatim (gratis,
  sin clave, pero con poco tráfico permitido: en producción conviene un proveedor de geocodificación).
  Nominatim no corrige faltas: si "calle, ciudad" no da nada, se busca sólo la calle en la zona que
  muestra el mapa y se avisa de la parte que no se encontró (`searchAddressLeniently`).
- **Anticipación mínima para reservas online**: la elige cada profesional en Configuración → Agenda,
  de 0 a 720 horas (24 al crear el negocio; 0 = hasta justo antes de la cita). La página pública y
  la API usan ese valor (también se valida en el backend). El profesional, desde su panel, puede
  agendar a cualquier hora.
- **Aplicación instalable (PWA)**: el panel se instala en el celular o el computador y se abre desde
  un icono, sin la barra del navegador (`public/manifest.webmanifest`, iconos `icon-app-*`). En
  Chrome y Edge, el botón "Instalar aplicación" del menú lateral (y una tarjeta en Inicio, sólo en el
  celular, que se puede descartar) abre el diálogo del navegador; en iPhone y iPad muestra los pasos
  de Compartir → "Agregar a inicio". El service worker (`src/sw.ts`, con `vite-plugin-pwa` en modo
  injectManifest) guarda sólo la app de cada versión, nunca datos de la API: abrir una página va
  primero a la red (4 s) y, sin conexión, usa el index.html guardado. Sólo lo activan el login, el
  onboarding, el panel y el panel de plataforma (`useInstallableApp`); la portada y la página de
  reservas no enlazan el manifiesto ni descargan la app. Sin conexión, la app espera en la pantalla
  de carga con un aviso y sigue sola cuando vuelve (no manda al login).
- **Avisos en el celular** (spec 013, Web Push estándar): el propietario de cada negocio, el super
  admin y, desde la spec 017, el rol Profesional con su agenda, sólo con el resumen de las 8 de la noche
  de su agenda (`audience="agenda"`, `AGENDA_PUSH_KINDS` en `src/lib/constants/push.ts`); Recepción y
  los administradores no los tienen, y en modo soporte nunca se ofrecen. Al entrar al panel, una
  franja ofrece «Activa los avisos en este celular» («Ahora no» la deja 7 días en ese aparato;
  `src/features/push/push-prompt.tsx`; al profesional sólo si tiene una agenda activa), y
  Configuración → Notificaciones (Configuración → Perfil para el profesional, su única pestaña, y
  Configuración en /admin) tiene la tarjeta «Avisos en este celular» (`push-settings-card.tsx`; al
  profesional sin agenda le explica que pida una al propietario, sin preguntar nada a la API):
  activar o desactivar en ese aparato, el aviso de prueba y un interruptor por tipo (todos encendidos
  de fábrica). Explica qué hacer en el iPhone sin instalar (sólo llegan con la app instalada, iOS 16.4
  o más) y con el permiso bloqueado. «Activar» llama a `pushManager.subscribe` en el mismo toque (el
  navegador pide el permiso ahí); al abrir el panel, `usePushDevice` guarda en silencio la suscripción
  del navegador (reanuda lo que pausó «Cerrar sesión» y se vuelve a suscribir si cambió la clave). El
  service worker muestra cada aviso (`push`) y, al tocarlo, abre su pantalla: con la app abierta navega
  sin recargar (`notification-navigation.ts`), si no abre una ventana, y con la sesión caducada pasa
  por `/login?next=…` (`safeNextPath`: sólo rutas propias del panel). La clave pública llega de
  `GET /api/push/config`: no hay variables nuevas. **Se prueban con la versión compilada**
  (`npm run build` y `npx vite preview`, con `API_PROXY_TARGET` apuntando a la API local); en
  `npm run dev` no hay service worker y la tarjeta lo dice. `vercel.json` (CSP) no cambia.
- **Centro de avisos del panel** (spec 014): una campana con el número de avisos sin leer («9+» con
  más de 9) en el panel del negocio y en /admin, sin activar nada. En la computadora va junto al logo
  del menú lateral y en el celular a la derecha de la barra de arriba (`AppShell` recibe `bell`; los
  menús la reciben sólo en la computadora). Para el lector de pantalla es «Avisos, 3 sin leer». Al
  tocarla, un `Popover` con los últimos 20 (`src/features/notices/`): título, texto con el nombre
  completo del paciente y hace cuánto («hace 5 min», «ayer»), los no leídos en el lila suave con un
  punto, «Marcar todo como leído», «Ver todos» y «No tienes avisos» con qué aparecerá ahí. Tocar un
  aviso lo marca leído y abre su pantalla (la cita en la agenda, la agenda del día o la ficha en
  /admin). «Ver todos» lleva a `/dashboard/notices` o `/admin/notices`: los de los últimos 30 días
  agrupados por día («Hoy», «Ayer», «Mar 13 oct»), con «Sólo los no leídos», «Marcar todo como leído»
  y «Cargar más». Cada persona ve lo suyo (la API decide con `NOTICE_AUDIENCE`, en
  `src/lib/constants/notices.ts`) y lleva su propio leído; el super admin en modo soporte no ve la
  campana del negocio. El contador (`useUnreadNotices`, `src/hooks/queries/use-notices.ts`) se pide al
  abrir el panel, al volver a la pestaña, cada 3 minutos sólo con la pestaña visible
  (`NOTICE_REFRESH_MS`, para no gastar la CPU de Vercel) y al momento cuando el service worker recibe
  un aviso al celular (`sw.ts` manda `agenda360:aviso` a las ventanas abiertas). Si la API todavía no
  tiene la ruta (404, mientras se publica el backend), la campana no se muestra y nada da error. Los
  textos salen de `src/lib/notices.ts` (`describeNotice`), los mismos del celular, que la API copia con
  `sync:shared`.
- **Citas por cerrar** (spec 018): las citas que ya terminaron y siguen Pendiente o Confirmada. Nada se
  cierra solo, y cada uno ve lo suyo: el rol Profesional, su agenda; el resto del equipo, el negocio.
  - **La lista** (`src/features/appointments/to-close/`): en la agenda, el botón «Por cerrar (N)» la
    abre en un diálogo (en el celular, en un `Sheet` desde abajo). De la más vieja a la más nueva,
    agrupadas por día (las de hoy al final, «Hoy · ya terminaron»), con «Completada», «No asistió» y
    «Cancelada» en cada una, «Marcar todas como completadas» (con confirmación), «Cargar más» (tandas de
    50) y «Todo al día» cuando no queda nada. La casilla «Avisar a los pacientes» viene **apagada**: es
    un cierre administrativo de citas que ya pasaron; con ella sale el email del cambio de estado (spec
    008), sin el aviso de WhatsApp. Si otra persona ya la cerró, se respeta su estado y la lista se
    recarga (la API responde 409).
  - **El bloqueo** (`dashboard-layout.tsx`): quien entra al panel con citas sin cerrar de **días
    anteriores** ve primero «Antes de seguir, cierra tus citas pendientes», con la lista, en lugar del
    panel. «Más tarde» lo deja entrar y dura 4 horas en ese aparato (`localStorage`, con `try/catch`;
    no va a la actividad): mientras, la franja «Tienes N citas por cerrar» con «Cerrarlas». Se mira al
    entrar y al cambiar de página, nunca en medio de un formulario. Las de hoy no bloquean. El super
    admin en modo soporte nunca se bloquea: ve la franja («Este negocio tiene N citas por cerrar»).
  - **El contador** (`useToCloseCount`, `src/hooks/queries/use-to-close.ts`) se pide como el de la
    campana: al entrar, al volver a la pestaña y cada 3 minutos sólo con la pestaña visible
    (`NOTICE_REFRESH_MS`), y al cambiar cualquier cita. Si la API todavía no tiene la ruta (404) o la
    cuenta no tiene agenda (403), ni franja ni bloqueo.
- **Las citas completadas quedan fijas** (spec 020): una cita Completada no cambia de estado ni de datos,
  salvo el pago, los comprobantes, las notas y la historia clínica, y ninguna cita vuelve a Pendiente. La
  regla es `canChangeStatus` de `src/lib/constants/appointment-status.ts`, la misma de la API y la beta.
  - **La ficha** (`appointment-details-sheet.tsx`): en una completada, en lugar de los botones de estado
    sale «Completada · ya no se puede cambiar», sin «Cancelar cita». En una confirmada (y en una «No
    asistió» o «Cancelada»), «Pendiente» va deshabilitado, con su ayuda («Una cita confirmada no vuelve a
    Pendiente»).
  - **«Editar»** (`appointment-form-dialog.tsx`): en una completada sólo se editan las notas; lo demás se
    ve deshabilitado, con el aviso arriba. Al editar, la lista de estados sólo trae los permitidos.
  - **«Corregir estado»** (`appointment-correction-dialog.tsx`): sólo lo ve el propietario
    (`session.role === "owner"`, también el super admin en modo soporte). Pide el estado correcto
    (Confirmada, No asistió o Cancelada), el motivo, de 10 a 300 caracteres con su contador, y «Avisar al
    paciente», **apagada**: es un arreglo interno. Llama a `POST …/appointments/:id/correct-status`
    (`useCorrectAppointmentStatus`); la ficha y la agenda se actualizan al momento y la actividad dice
    el motivo.
- **Sin reservas dobles**: nunca dos citas a la misma hora (lo garantiza la base). Cada negocio elige
  en Configuración → Agenda cuántas citas puede reservar una misma persona (por su cédula) el mismo
  día desde su página (1 por defecto, hasta 3 o sin límite). La página de reservas oculta al momento
  la hora que se acaba de reservar o que otra persona tomó (aunque la CDN aún no lo refleje).
- **Código QR de la página de reservas**: en Configuración → Negocio, junto al enlace público,
  "Código QR" lo muestra y lo descarga como PNG listo para imprimir (con "Reserva tu cita", el
  nombre del negocio y el enlace escrito) o como SVG. Se genera en el navegador con `uqr`.
- **Avisos por WhatsApp al cambiar una cita**: al confirmar, cancelar, reprogramar, completar o marcar
  "No asistió" desde el panel se abre un aviso con el mensaje para el cliente ya escrito (editable) y
  el botón "Abrir WhatsApp" (enlace `wa.me`: lo envía el profesional, sin coste). El email
  automático se sigue enviando igual. Se activa o apaga en Configuración → Notificaciones → "Avisos
  por WhatsApp" (dos interruptores: confirmar/cancelar/reprogramar y completada/no asistió). Al abrir
  WhatsApp queda en la actividad de la cita ("Abrió WhatsApp para avisar…"; no se sabe si lo envió).
- **WhatsApp**: el negocio escribe al cliente desde el detalle de la cita o su ficha, y el
  cliente escribe al negocio desde la página de reservas ("Escríbenos por WhatsApp", p. ej. para
  una cita con menos anticipación de la permitida). Abre la conversación con un mensaje ya escrito (enlace `wa.me`, sin API ni coste). Los números sin
  prefijo internacional toman el del país del negocio.
- **Importar pacientes desde un Excel (.xlsx) o un CSV** (spec 012): Clientes → «Importar pacientes»
  (`/dashboard/clients/importar`, permiso `clients.import`: propietario, administradores y super admin
  en modo soporte; también en el estado «Aún no tienes clientes»). Tres pasos:
  - **Archivo:** se elige o se arrastra, de hasta 10 MB y 5.000 filas, o se descarga la plantilla
    (`public/plantilla-pacientes.xlsx`: sólo los títulos, con la cédula y el teléfono como texto para
    que Excel no borre el 0). Se lee en el navegador y no se sube ni se guarda; nada queda en
    `localStorage`. El lector de Excel (`read-excel-file`, versión fija) se descarga sólo al elegir un
    .xlsx (import dinámico en `features/clients/import/read-spreadsheet.ts`); el CSV lo lee
    `src/lib/csv.ts` (UTF-8 o Windows-1252, `;`, `,` o tabulador).
  - **Columnas:** la hoja (se propone la primera con títulos reconocidos), la fila de títulos (entre
    las 10 primeras) y a qué dato va cada columna, con los nombres habituales ya asignados («CI»,
    «Correo», «Celular»…), «Añadir a las notas» y «No importar».
  - **Revisión:** cuántos se importarán, cuántos ya existían, cuáles tienen errores (fila y motivo),
    cuáles están repetidos y cuántos no entran por el tope del plan, con «Descargar las filas con
    errores». Usa el mismo código que la API (`src/lib/validations/client-import.ts`, compartido).
  - **Datos por completar** (ampliación del 2026-10-15):
    - la casilla «Importar también los que tienen datos por completar» viene encendida;
    - con ella basta el nombre, y las filas a las que les falta un dato obligatorio del negocio entran
      marcadas «Por completar»;
    - lo mal escrito sigue con error;
    - en Clientes hay un filtro «Por completar» y la marca (`components/shared/incomplete-badge.tsx`);
    - la ficha dice «Faltan datos: …» con «Completar»;
    - se calcula con `missingRequiredFields` (`src/lib/validations/client.ts`): no se guarda, y
      desaparece al completarlo.

  Se importan en una sola petición, todo o nada; si se corta la conexión, la pantalla lo dice y
  repetir no duplica. Los importados no reciben emails y no cuentan como clientes nuevos del mes.
- Onboarding en 6 pasos, agenda día/semana/mes, clientes (con buscador en "Nueva cita"),
  servicios, horarios partidos, bloqueos, página pública de reservas sin registro, reportes y configuración.

## Rendimiento

El panel nunca descarga el historial completo de citas: Inicio pide desde el inicio del mes (o de
la semana) en adelante; Reportes, el periodo elegido más la semana y el mes en curso; "Nueva cita",
sólo las citas del día elegido (para avisar de solapamientos); el detalle, sólo esa cita
(`useAppointment`). La última y la próxima cita de cada cliente, y su primera visita (Reportes →
clientes nuevos y recurrentes), las calcula la API (`useClientActivity`).

## Arquitectura

- **Capa de datos.** Los componentes nunca llaman a `fetch`: usan hooks (`src/hooks/queries`) que
  llaman a `data.*` (`src/lib/data/index.ts`), implementado en `lib/data/api-repository.ts` sobre la
  API. Las claves de caché de TanStack Query incluyen el `businessId`.
- **Sesión** en una cookie `httpOnly` que gestiona la API: el frontend nunca ve el token. Caduca a
  las 12 horas sin usarla (con "Recordarme", a los 14 días sin usarla; cada uso la renueva). Si la API
  responde 401 (sesión caducada o cerrada en otro dispositivo), la app vuelve al login; con
  `two_factor_required`, vuelve a leer la sesión y muestra la pantalla para activar la verificación.
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
buscador de direcciones (Nominatim) y a Supabase (los archivos de la historia clínica, los
comprobantes de pago y las imágenes se suben directo desde el navegador), y nadie puede mostrar la web dentro de otra (clickjacking).
Si se añade un servicio externo nuevo, hay que permitirlo ahí.

El CAPTCHA (Cloudflare Turnstile) lo activa la API: con sus claves configuradas, el perfil público
trae `captchaSiteKey` y la página de reservas carga el widget (`src/features/booking/use-captcha.ts`).
El registro (`/register`) usa el mismo widget con la Site Key de `GET /api/public/captcha`.

La API es otro proyecto de Vercel (ver agenda-backend). `middleware.ts` (Routing Middleware de
Vercel) reenvía `/api/*` a esa API: el navegador sólo habla con el dominio del frontend, así que la
cookie de sesión es propia y no hace falta CORS. Como Vercel reemplaza la IP del visitante al pasar
por un proxy, el middleware la envía aparte, firmada con `PROXY_SECRET` y la hora (HMAC-SHA256 de
`<ip>.<segundos>`, que la API sólo acepta durante 2 minutos: spec 009), para que los límites
anti-abuso de la API sean por visitante. La firma va en todas las peticiones: con la API en AWS
Lambda (Function URL pública), lo que no la trae recibe 403. El secreto ya no viaja en ninguna
cabecera (fase 2 de la spec 009). Las peticiones a `/api/public/*` van sin la cookie de sesión.

Variables de entorno del proyecto en Vercel (no llevan el prefijo `VITE_`: sólo las lee el
middleware, nunca llegan al navegador):

| Variable | Valor |
| --- | --- |
| `API_URL` | URL de la API, p. ej. `https://agenda-backend.vercel.app` |
| `PROXY_SECRET` | El mismo valor que en la API |

En local no se usa el middleware: el proxy de Vite (`vite.config.ts`) reenvía `/api` sin firma, y la
API usa la IP de la conexión.
