# Especificación: Velocidad en el celular

**Carpeta**: `specs/003-velocidad-movil` (rama de trabajo: `dev`)

**Creada**: 2026-10-13

**Estado**: Aprobada (2026-10-13, en la conversación: las cuatro mejoras propuestas)

**Pedido**: Speed Insights de Vercel marca 74 ("mejorable") en celulares. Medición local (celular
simulado: CPU 4× más lenta, 4G lenta de 1,6 Mbps y 150 ms):

| Página | Primer dibujo (FCP) | Contenido principal (LCP) | Descarga |
|---|---|---|---|
| Portada | 2,0 s | 2,0 s | 255 KB |
| Login | 1,9 s | 1,9 s | 255 KB |
| Reservas con mapa | 1,9 s | 3,0 s | 767 KB |
| Reservas sin mapa | 1,9 s | 3,0 s | 319 KB |

CLS 0 y bloqueo del hilo principal bajo (< 25 ms): no son el problema.

## Escenarios de uso y pruebas *(obligatorio)*

### Historia 1 - El paciente ve la página de reservas antes (Prioridad: P1)

Un paciente abre el enlace de reservas desde WhatsApp en su celular. Hoy la app termina de cargar y
recién entonces pide los datos del negocio. Debe pedirlos al mismo tiempo que carga la app.

**Prueba independiente**: medir el LCP de `/book/<negocio>` en el celular simulado antes y después.

**Escenarios de aceptación**:

1. **Dado** un celular con 4G lenta, **cuando** abre `/book/<negocio>`, **entonces** los datos del
   negocio se piden antes de que termine de cargar la app y el contenido principal aparece al menos
   0,5 s antes que hoy.
2. **Dado** un enlace de un negocio que no existe, **cuando** lo abre, **entonces** ve el mismo
   aviso de hoy.

### Historia 2 - El mapa sólo se descarga si el paciente lo va a ver (Prioridad: P1)

**Escenarios de aceptación**:

1. **Dado** un negocio con ubicación, **cuando** el paciente abre su página y no baja hasta el
   mapa, **entonces** el mapa (unos 450 KB) no se descarga.
2. **Dado** el mismo negocio, **cuando** el paciente baja hasta "Cómo llegar", **entonces** el mapa
   aparece como hoy (con un marcador de espacio mientras carga, sin saltos de la página).

### Historia 3 - La pantalla de carga aparece al instante (Prioridad: P2)

**Escenarios de aceptación**:

1. **Dado** un celular con 4G lenta, **cuando** abre cualquier página, **entonces** el logotipo de
   carga aparece sin esperar los estilos de la app (primer dibujo por debajo de 1,2 s en la
   simulación).
2. **Dado** que la app termina de cargar, **cuando** se muestra, **entonces** nunca aparece sin
   estilos (sin parpadeo de contenido sin formato).

### Historia 4 - Menos que descargar al principio (Prioridad: P2)

**Escenarios de aceptación**:

1. **Dado** cualquier página, **cuando** se carga, **entonces** el validador de formularios no
   viene en la descarga inicial (se descarga con las pantallas que tienen formularios).
2. **Dado** un formulario (login, registro, reserva, panel), **cuando** se envía con errores,
   **entonces** los mensajes de validación son los de hoy y no hay errores de la política de
   seguridad (CSP) en la consola.

### Casos límite

- Página de reservas abierta desde la app instalada (service worker): funciona igual.
- La petición adelantada falla (sin conexión): la página se comporta como hoy (aviso de conexión).
- Navegar dentro de la app a otra página de reservas: no reutiliza la petición adelantada de otra.
- Navegador sin `IntersectionObserver`: el mapa se carga como hoy.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **RF-001**: Al abrir `/book/<negocio>`, los datos públicos del negocio DEBEN pedirse en cuanto
  llega la página, en paralelo con la app, y la app DEBE reutilizar esa respuesta una sola vez.
- **RF-002**: El mapa de la página de reservas DEBE descargarse sólo cuando su sección está por
  entrar en pantalla.
- **RF-003**: La pantalla de carga DEBE dibujarse sin esperar la hoja de estilos de la app, sin que
  la app aparezca nunca sin estilos.
- **RF-004**: El validador de formularios (Zod) NO DEBE estar en el paquete inicial, y su
  configuración para la CSP DEBE aplicarse antes de crear cualquier esquema.
- **RF-005**: Nada cambia en el comportamiento ni en el aspecto de las páginas.
- **RF-006**: Sin cambios en la API, en los archivos compartidos con el backend ni en la CSP.

## Criterios de éxito *(obligatorio)*

- **CE-001**: LCP de la página de reservas en la simulación: al menos 0,5 s menos que hoy (3,0 s).
- **CE-002**: Descarga de la página de reservas con mapa, sin bajar hasta él: al menos 400 KB menos
  (767 KB hoy).
- **CE-003**: Primer dibujo (FCP) en la simulación: por debajo de 1,2 s en portada, login y reservas.
- **CE-004**: Paquete inicial sin Zod (comprobado en el mapa de fuentes del build).
- **CE-005**: Las pruebas de reportes (spec 002) y del acceso (spec 001) siguen pasando; login,
  registro y reserva funcionan con validación en local, sin errores en la consola.
- **CE-006**: Speed Insights sube por encima de 74 en celulares después de publicar (necesita
  visitas reales; se revisa días después).

## Supuestos

- La medición es local con la app compilada como en producción (brotli, cabeceras de
  `vercel.json`); en producción también influyen la red real y el arranque de la API.
- La beta no se incluye: sus datos están en el navegador y no tiene API que esperar.
