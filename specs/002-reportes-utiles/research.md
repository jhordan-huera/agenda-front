# Investigación: Reportes útiles

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-10-13

## 1. ¿Hace falta tocar la API?

- **Hallazgo**: `GET /appointments?from&to` devuelve las citas de cualquier rango (sin tope) con
  `source`, `status`, `price`, `professionalId`, horas y fechas, ya filtradas por agenda para el rol
  Profesional. `GET /clients/activity` devuelve por paciente sus totales, `firstVisit`, la última
  cita pasada (`lastAppointment`) y la próxima (`nextAppointment`), también filtrado por agenda.
- **Decisión**: todo se calcula en el front, con funciones puras como las de hoy
  (`report-stats.ts`). Sin cambios en la API ni migración.
- **Coste**: un año con su año de comparación son unas pocas miles de citas en una consulta
  indexada por negocio y fecha; la CPU de Vercel apenas cambia (una petición por cambio de
  periodo, como hoy).

## 2. Periodo y comparación

- **Decisión**: un tipo `ReportPeriodChoice` con tres formas: días (7/30/90), mes (`AAAA-MM`) y
  rango (`desde`–`hasta`). `resolvePeriod(choice, hoy)` devuelve el rango, el rango de comparación
  y la etiqueta.
  - Días: los últimos N días con hoy; compara con los N anteriores.
  - Mes pasado: del 1 al último día; compara con el mes anterior completo.
  - Mes en curso: del 1 a hoy; compara con los mismos días del mes anterior (si el mes anterior es
    más corto, hasta su último día).
  - Rango: hasta 366 días; compara con el rango anterior del mismo largo.
- **Carga**: una sola petición de citas desde el inicio del periodo de comparación hasta el final
  del periodo, de la semana o del mes en curso, lo que llegue más lejos (amplía
  `getReportFetchRange`).
- **Alternativa descartada**: dos peticiones (actual y anterior): el doble de llamadas a la API.

## 3. Cómo se muestra el cambio

- **Decisión**: `compareValues(actual, anterior, mejor: "sube" | "baja")` devuelve el cambio en
  porcentaje (o `null` si el anterior es 0 o no hay datos) y si es favorable. Un componente
  `Trend` lo pinta: "▲ 18 %" o "▼ 5 %", verde si es favorable y rojo si no, con texto para lectores
  de pantalla ("18 % más que el periodo anterior"). Sin cambio: "= igual".
- Ingresos, citas, completadas, asistencia, ocupación, por tu página y pacientes: mejor si suben.
  Cancelaciones y no asistió: mejor si bajan.
- `MetricStrip` recibe un `trend` opcional por cifra (aditivo: el Inicio no cambia).
- **Colores**: verde y rojo semánticos (los mismos tonos de los estados de cita), no los de la
  marca: un negocio con marca roja no debe confundir "bueno" con "malo". La flecha y el texto
  evitan depender sólo del color.

## 4. Elegir el periodo

- **Decisión**: pestañas "7 días · 30 días · 90 días · Mes · Fechas". "Mes" muestra un selector con
  los últimos 24 meses ("octubre 2026"). "Fechas" muestra dos campos de fecha nativos (como el
  filtro de Actividad, `audit-filters-bar.tsx`), con aviso si el rango pasa de 366 días o está al
  revés.
- **Alternativa descartada**: un calendario desplegable (no hay componente; añadiría una
  dependencia).

## 5. Gráfico de volumen en rangos largos

- **Decisión**: `getVolumeSeries` pasa de `groupByWeek` a una granularidad: por día hasta 31 días,
  por semana hasta 120 y por mes por encima.

## 6. Mapa de días y horas

- **Decisión**: una tabla HTML real (accesible sin trabajo extra): filas = horas, columnas = días
  (lun–dom, sólo los días con horario o con citas). Así, en el celular caben 7 columnas estrechas.
  Cada celda lleva el número y un fondo con `color-mix` del color principal según la intensidad;
  las celdas vacías quedan en blanco. Horas: de la más temprana a la más tardía entre horarios y
  citas del periodo.
- **Alternativa descartada**: un gráfico de recharts (no tiene mapa de calor y la tabla accesible
  habría que hacerla aparte).

## 7. Ocupación con una o varias agendas

- **Decisión**: se reutiliza `getProfessionalBreakdown` y se suma: minutos con citas / minutos de
  horario (sin bloqueos) de las agendas elegidas. Con una sola agenda se calcula para ella. La
  comparación usa el horario actual también para el periodo anterior (igual que hoy; se dice en la
  descripción).

## 8. Reservas por la página

- **Decisión**: citas no canceladas del periodo con `source = "booking_page"` frente a
  `"dashboard"`. "Pacientes nuevos por tu página": pacientes cuya primera visita
  (`firstVisit`) cae en el periodo y cuya primera cita no cancelada del periodo vino de la página.

## 9. Pacientes que más vienen, más faltan y que no volvieron

- **Más vienen**: citas no canceladas del periodo por paciente (máx. 5), con lo cobrado en
  completadas.
- **Más faltan**: citas "no asistió" del periodo por paciente (máx. 5, al menos 1), con su
  asistencia (completadas / (completadas + no asistió)).
- **No volvieron**: de `clients/activity`, pacientes activos con `lastAppointment` (pasada, no
  cancelada) anterior a hoy menos el umbral (30/60/90 días) y sin `nextAppointment`. Orden: los que
  dejaron de venir más recientemente primero (los más fáciles de recuperar). En pantalla, de 10 en
  10 con "Ver más"; en la impresión, hasta 30 y "y N más".
- **WhatsApp**: `getWhatsAppUrl(teléfono, zona horaria, mensaje)` (ya existe) con un mensaje nuevo:
  "Hola {nombre}, hace tiempo que no te vemos en {negocio}. Cuando quieras agendar tu próxima
  cita, puedes elegir tu hora aquí: {enlace de reservas}". El texto se puede editar en WhatsApp
  antes de enviarlo. Enlace de reservas: `${origin}/book/${slug}` (como en `whatsapp-notice.tsx`).
- Los nombres salen de `useClients()`. Pacientes restringidos (reserva aún no gestionada): sin
  teléfono, así que sin botón.

## 10. Imprimir o PDF

- **Hallazgo**: el marco del panel ya se oculta al imprimir (`print:hidden` en el menú, la cabecera
  y los avisos; `print:p-0` en el contenido), como usa la historia clínica.
- **Decisión**: se imprime la misma página de Reportes con `window.print()`. Los controles, botones
  y teléfonos llevan `print:hidden`; un encabezado sólo para impresión (`hidden print:flex`) muestra
  logo, nombre del negocio, periodo, profesional y fecha de generación. Las tarjetas llevan
  `print:break-inside-avoid`. Los gráficos de recharts son SVG con `viewBox`: con
  `max-width: 100%` y `height: auto` al imprimir se ajustan al ancho de la hoja.
- **Alternativa descartada**: una ruta aparte de impresión (duplicaría el reporte entero).

## 11. Comprobación

- El front no tiene pruebas unitarias. Para CE-001 se comparan las cifras de la página (leídas con
  Playwright) con consultas SQL sobre la misma base local de prueba (datos demo, fechas relativas a
  hoy) y un caso preparado a mano (paciente con 70 días sin venir, celdas del mapa conocidas).
