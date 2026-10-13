# Reporte final: Reportes útiles

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tareas**: [tasks.md](./tasks.md)

**Estado**: Implementada en dev (y en la beta) · **Fecha**: 2026-10-13

**Repos**: agenda-front (+ `agenda-beta`, sin git) · **Migración**: No

## Resumen

Reportes ya no muestra cifras sueltas. Cada cifra se compara con el periodo anterior (▲▼). Se
puede elegir un mes o unas fechas. Hay una lista de pacientes que no volvieron, con un botón de
WhatsApp para invitarlos a reservar. También muestra:
- cuántas citas llegan solas por la página de reservas;
- quiénes vienen y faltan más;
- un mapa de los días y horas más pedidos;
- la ocupación del horario, también con una sola agenda.

Todo se puede imprimir o guardar en PDF. La beta tiene lo mismo con sus datos de prueba.

## Qué se entrega

| Historia | Prioridad | Estado | Notas |
|---|---|---|---|
| H1 – Saber si voy mejor o peor | P1 | Hecha | ▲▼ en ingresos, cobrado, citas, completadas, cancelaciones, no asistió, ocupación, por tu página y pacientes |
| H2 – Elegir el mes o las fechas | P1 | Hecha | 7/30/90 días, últimos 24 meses, rango de hasta 366 días |
| H3 – Recuperar a los que no volvieron | P1 | Hecha | 30/60/90 días, de 10 en 10, WhatsApp con el enlace de reservas |
| H4 – Lo que trae la página de reservas | P2 | Hecha | Citas y pacientes nuevos por la página, con tendencia |
| H5 – Los que más vienen y más faltan | P2 | Hecha | 5 y 5 del periodo |
| H6 – Días y horas más pedidos | P2 | Hecha | Tabla de calor accesible |
| H7 – Ocupación con una sola agenda | P2 | Hecha | Cifra "Ocupación" con tendencia en puntos |
| H8 – Imprimir o PDF | P3 | Hecha | Encabezado con logo; sin menú, botones ni teléfonos |

## Comprobación

Playwright contra la API y la base locales de prueba, comparando lo que muestra la página con
consultas SQL sobre la misma base (datos demo, con fechas relativas a hoy). También un paciente
preparado que lleva 70 días sin venir.

| Requisito o criterio | Resultado | Cómo se comprobó |
|---|---|---|
| RF-001 – Tendencia en cada cifra, buena o mala según la cifra | Cumple | 5 cifras × 4 periodos = SQL (porcentaje y flecha); cancelaciones y no asistió en rojo al subir (capturas) |
| RF-002 – "Sin datos para comparar" | Cumple | Rango del 7 de septiembre al 13 de octubre (antes no hay citas en la demo): las cifras muestran "Sin datos para comparar" |
| RF-003 – Días, mes (24) o rango hasta 366 días | Cumple | Septiembre, octubre en curso, 1–15 oct y un año; un rango de más de un año muestra "Elige como máximo 366 días" y no cambia el reporte |
| RF-004 – Con qué se compara | Cumple | "Del 1 al 30 de septiembre · comparado con del 1 al 31 de agosto"; "Del 1 al 13 de octubre · comparado con del 1 al 13 de septiembre"; "1 al 15 de octubre · comparado con del 16 al 30 de septiembre" |
| RF-005 – Pacientes que no volvieron | Cumple | Paciente preparado (70 días): aparece con 60 y no con 90; nadie con cita futura en la lista; en la beta, 4 casos preparados (con cita futura, sólo cancelada, faltó hace 40 días, inactivo) dan lo esperado |
| RF-006 – WhatsApp con mensaje y enlace | Cumple | `https://wa.me/593991234567?text=Hola Paciente, hace tiempo que no te vemos en Centro Profesional… /book/jhordan` |
| RF-007 – Reservas por la página | Cumple | "Por tu página" = SQL en los 4 periodos y en la clínica; tarjeta con % y nuevos por la página |
| RF-008 – Los que más vienen y más faltan | Cumple | El primero de "más vienen" = SQL (Carlos Pérez, 21 citas) |
| RF-009 – Mapa de días y horas accesible | Cumple | Las 41 celdas con citas = SQL; es una tabla con `caption` y textos para lector de pantalla |
| RF-010 – Ocupación con una o varias agendas | Cumple | 48 % (una agenda) con "▲ 40 pts"; tabla por profesional en la clínica |
| RF-011 – Filtro de profesional en todo | Cumple | Clínica con "Dr. Andrés Vega": cifras y tendencias = SQL filtrado por su agenda |
| RF-012 – Impresión sin menú, botones ni teléfonos | Cumple | Estilos de impresión: encabezado visible, menú oculto, 0 botones, sin teléfono; PDF A4 generado; el gráfico se imprime completo |
| RF-013 – Lo que ya había sigue | Cumple | Ingresos de hoy, semana y mes, volumen, estados, servicios y tabla por profesional en las capturas |
| RF-014 – Sin desborde en el celular | Cumple | WebKit a 320 y 390 px: 0 px (front y beta) |
| RF-015 – Permisos sin cambios | Cumple | La página sigue con `reports.view`; los datos salen de las mismas consultas, filtradas por la API |
| RF-016 – Colores de la marca | Cumple | Barras y mapa con `--primary`; sólo "mejor/peor" usa verde y rojo fijos, con flecha y texto (decisión del plan) |
| RF-017 – La beta igual | Cumple | Mismos archivos de cálculo y componentes; 17 comprobaciones en la beta; sin errores de JavaScript |
| CE-001 – Cifras = cálculo a mano | Cumple | Ver RF-001, RF-007 y RF-009 |
| CE-002 – Un año en menos de 2 s | Cumple | 466 ms en local |
| CE-003 – WhatsApp en un toque | Cumple | Un enlace por paciente con teléfono |
| CE-004 – 0 px de desborde a 320/390 | Cumple | Ver RF-014 |
| CE-005 – A4 sin tarjetas cortadas | Cumple (simulado) | Vista de impresión al ancho útil de A4 con tarjetas `break-inside: avoid`; la lista larga sí puede pasar de página |
| CE-006 – Más útil que el actual | Pendiente | Lo aprueba el dueño del producto |
| CE-007 – La beta da lo mismo | Cumple | Ver RF-017 |

**Pruebas automáticas**: `npm run build` y `npm run lint` sin errores ni avisos, en agenda-front y en
la beta (repetidos al final).

## Cambios respecto al plan

- **Ajuste de la spec (aprobado con el plan)**: el mes en curso cubre del 1 a hoy y se compara con
  los mismos días del mes anterior.
- **La beta, pedida al aprobar el plan**: se actualizaron spec, plan y tareas antes de tocarla.
- **El gráfico de citas ya no se anima**: al imprimir se redibujaba al ancho de la hoja y salía
  vacío.
- **«Reservas por tu página» y «Pacientes» van apiladas junto al mapa**: así ninguna tarjeta queda
  sola en su fila.
- **Las pestañas del periodo ocupan todo el ancho en el celular**: a 320 px se salían 57 px.

## Pendientes y riesgos

- **Ocupación del periodo anterior**: se calcula con el horario actual (igual que antes). Si
  cambiaste el horario, la comparación es aproximada.
- **Periodos anteriores casi vacíos**: en la demo la comparación da porcentajes muy altos (▲ 500 %)
  porque hay pocos datos antes del 7 de septiembre. Con datos reales se verán normales.
- **Respaldo de la beta** antes del cambio:
  `~/Documentos/Proyectos/Betas/agenda-beta-respaldo-antes-de-reportes-2026-10-13.tar.gz`.
- **Falta tu aprobación** del resultado (CE-006).

## Commits

| Repo | Commit | Mensaje |
|---|---|---|
| agenda-front | 9195bad | Spec 002: reportes útiles |
| agenda-beta | — | Sin git: cambios en el disco (respaldo arriba) |

## Cómo publicarlo

1. Sin migración.
2. PR `dev` → `main` en agenda-front.
3. Después de publicar: comprobar que el despliegue de Vercel del front quede "Ready" y abrir
   Reportes con un negocio real.

## Texto para el PR

Reportes útiles (spec 002):
- cada cifra comparada con el periodo anterior;
- mes o fechas;
- pacientes que no volvieron, con WhatsApp;
- reservas por la página, los que más vienen y más faltan;
- mapa de días y horas, ocupación con una agenda;
- imprimir o PDF.

Sin cambios en la API ni migración.

Reporte: [specs/002-reportes-utiles/reporte.md](https://github.com/jhordan-huera/agenda-front/blob/main/specs/002-reportes-utiles/reporte.md)
