---

description: "Tareas de Reportes útiles"
---

# Tareas: Reportes útiles

**Entrada**: documentos de diseño en `specs/002-reportes-utiles/`

**Requisitos previos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[contracts/calculos.md](./contracts/calculos.md), [quickstart.md](./quickstart.md)

**Pruebas**: sin pruebas unitarias (el front no tiene). La comprobación es build, lint y Playwright
+ SQL en la fase final.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: en paralelo (otro archivo, sin depender de tareas pendientes).
- **[US1]…[US8]**: historia de la spec. Rutas relativas a agenda-front salvo que digan `beta/`
  (= `~/Documentos/Proyectos/Betas/agenda-beta`).

---

## Fase 1: Preparación

- [x] T001 Comprobar que `npm run build` y `npm run lint` pasan en agenda-front y en la beta antes de tocar nada
- [x] T002 Respaldo de la beta en `~/Documentos/Proyectos/Betas/agenda-beta-respaldo-antes-de-reportes-2026-10-13.tar.gz` (sin `node_modules` ni `dist`)

---

## Fase 2: Base (bloquea las historias)

- [x] T003 [P] Crear `src/features/reports/report-period.ts`: `ReportPeriodChoice`, `resolvePeriod`, `rangeError`, `recentMonths`, `getReportFetchRange(period, today)`, `compareValues` (contrato)
- [x] T004 [P] Crear `src/features/reports/trend.tsx`: ▲▼ con porcentaje, verde/rojo semántico, "= igual", "sin datos para comparar" y texto `sr-only`
- [x] T005 [P] Añadir `trend?: ReactNode` a `Metric` en `src/features/dashboard/metric-strip.tsx` (se muestra junto al valor; sin él, igual que hoy)
- [x] T006 En `src/features/reports/report-stats.ts`: `volumeGranularity` y `getVolumeSeries` por día/semana/mes; `getTotalOccupancy`; quitar el `getReportFetchRange` antiguo y `REPORT_PERIODS`/`ReportPeriod` si quedan sin uso
- [x] T007 En `src/features/reports/appointments-volume-chart.tsx`: título y etiquetas según la granularidad; SVG al ancho de la hoja al imprimir

**Punto de control**: compila; la página actual sigue funcionando con los cambios de firma.

---

## Fase 3: Historias 1 y 2 - Comparación y periodo libre (P1) 🎯 MVP

**Prueba independiente**: quickstart 1–4 y 14.

- [x] T008 [P] [US2] Crear `src/features/reports/period-picker.tsx`: pestañas 7/30/90/Mes/Fechas, selector de los últimos 24 meses, dos fechas nativas con el error de `rangeError`, `print:hidden`
- [x] T009 [US1] Reescribir la cabecera y el estado de `src/pages/dashboard/reports-page.tsx`: `ReportPeriodChoice` (30 días por defecto), `resolvePeriod`, una sola carga con `getReportFetchRange`, resumen del periodo actual y del anterior, descripción "Del … · comparado con …"
- [x] T010 [US1] En `reports-page.tsx`: tendencia en "Ingresos estimados" y "Cobrado", y en las cifras citas, completadas, cancelaciones (mejor si baja), no asistió (mejor si baja) con asistencia
- [x] T011 [US1] En `reports-page.tsx`: "Pacientes" (nuevos y recurrentes) con tendencia, usando `firstVisits` de `clients/activity` para los dos periodos

**Punto de control**: comparación y periodo libre funcionan solos.

---

## Fase 4: Historia 3 - Pacientes que no volvieron (P1)

**Prueba independiente**: quickstart 5 y 6.

- [x] T012 [P] [US3] Crear `src/features/reports/report-insights.ts` con `ClientVisits`, `summarizeClientVisits`, `LAPSED_THRESHOLDS` y `getLapsedClients` (el resto del archivo llega en las historias 4–6)
- [x] T013 [P] [US3] Añadir `buildWinBackMessage` en `src/lib/whatsapp.ts`
- [x] T014 [US3] Crear `src/features/reports/lapsed-clients-card.tsx`: umbral 30/60/90 (60 por defecto), lista de 10 en 10 con "Ver más", última visita, veces, enlace a la ficha, botón "Escribir por WhatsApp" (`print:hidden`, sólo con teléfono), estado vacío; en impresión hasta 30 y "y N más"
- [x] T015 [US3] Integrar en `reports-page.tsx`: `ClientVisits` desde `clients/activity`, pacientes activos de `useClients()`, enlace de reservas `${origin}/book/${slug}`

---

## Fase 5: Historias 4 y 5 - Página de reservas y pacientes destacados (P2)

**Prueba independiente**: quickstart 7 y 8.

- [x] T016 [US4] Añadir `getBookingChannels` a `src/features/reports/report-insights.ts`
- [x] T017 [P] [US4] Crear `src/features/reports/booking-channels-card.tsx` (página vs panel, % y nuevos por la página, con tendencia)
- [x] T018 [US5] Añadir `getTopClients` y `getMostNoShows` a `src/features/reports/report-insights.ts`
- [x] T019 [P] [US5] Crear `src/features/reports/top-clients-cards.tsx` (dos tarjetas, nombre con enlace a la ficha, estados vacíos)
- [x] T020 [US4] [US5] Integrar en `reports-page.tsx`: cifra "Por tu página" con tendencia, tarjeta de canales y las dos tarjetas de pacientes

---

## Fase 6: Historias 6 y 7 - Días y horas, y ocupación (P2)

**Prueba independiente**: quickstart 9–11.

- [x] T021 [US6] Añadir `getDemandHeatmap` a `src/features/reports/report-insights.ts`
- [x] T022 [P] [US6] Crear `src/features/reports/demand-heatmap.tsx`: `<table>` con `<caption>`, filas = horas, columnas = días, número visible, intensidad con `color-mix` del primario, sin desborde a 320 px
- [x] T023 [US7] En `reports-page.tsx`: cifra "Ocupación" con tendencia (una o varias agendas, `getTotalOccupancy` para el periodo y el anterior); mapa de calor integrado; filtro de profesional aplicado a todo

---

## Fase 7: Historia 8 - Imprimir o PDF (P3)

**Prueba independiente**: quickstart 12.

- [x] T024 [P] [US8] Crear `src/features/reports/print-header.tsx` (logo, negocio, periodo, profesional, fecha de generación; `hidden print:flex`)
- [x] T025 [US8] En `reports-page.tsx`: botón "Imprimir o PDF" (`window.print()`), `print:hidden` en controles, `print:break-inside-avoid` en tarjetas, teléfonos ocultos al imprimir

---

## Fase 8: Comprobación en agenda-front

- [x] T026 `npm run build` y `npm run lint` sin errores ni avisos
- [x] T027 Playwright + SQL en la base local de prueba (puertos propios): cifras y comparaciones contra SQL (CE-001), paciente preparado con 70 días (aparece con 60, no con 90), WhatsApp, mapa de calor, ocupación con una y con varias agendas, filtro de profesional, rango de un año < 2 s, desborde 0 a 320/390 px, PDF sin teléfonos y con tarjetas enteras

---

## Fase 9: Beta (RF-017)

- [x] T028 Copiar a `beta/src/features/reports/` los archivos nuevos idénticos (`report-period.ts`, `report-insights.ts`, `trend.tsx`, `period-picker.tsx`, `demand-heatmap.tsx`, `booking-channels-card.tsx`, `top-clients-cards.tsx`, `lapsed-clients-card.tsx`, `print-header.tsx`)
- [x] T029 Fusionar en la beta los cambios de `report-stats.ts`, `appointments-volume-chart.tsx`, `metric-strip.tsx` y `whatsapp.ts`, conservando sus diferencias propias
- [x] T030 Adaptar `beta/src/pages/dashboard/reports-page.tsx`: todas las citas cargadas, `summarizeClientVisits` para primera/última/próxima visita, mismo orden y bloques que el front
- [x] T031 `npm run build` y `npm run lint` de la beta; Playwright sobre su servidor de desarrollo en un puerto de prueba: mismas comprobaciones con sus datos (CE-007), desborde 0 a 320/390 px, impresión

---

## Fase 10: Cierre

- [x] T032 Marcar las tareas, `/speckit-reporte` (reporte final) y commit en `dev` del front, sin push

---

## Fase 11: Documento para imprimir (RF-018)

- [x] T033 [US8] Crear `src/features/reports/report-print-document.tsx` (encabezado, resumen de 8 cifras con valor anterior, gráfico SVG propio, tablas, `print-color-adjust: exact`)
- [x] T034 [US8] `reports-page.tsx`: pantalla en `print:hidden`, documento de impresión, umbral de "no volvieron" en la página; `lapsed-clients-card.tsx` controlado y sin límites de impresión; quitar `print-header.tsx` y los ajustes de impresión del gráfico de pantalla
- [x] T035 [US8] `@page` en `src/index.css`: A4, márgenes y cajas de margen (negocio y periodo, "Página X de Y", arriba vacías)
- [x] T036 [US8] Comprobar: PDF A4 sin huecos (Playwright), cifras del PDF = pantalla, colores con fondos desactivados; build y lint
- [x] T037 [US8] Pasar a la beta (mismos archivos y la página adaptada); build, lint y PDF de la beta
- [ ] T038 Actualizar `reporte.md` y commit en `dev`, sin push

## Dependencias y orden

- Fase 1 → Fase 2 → historias. T003–T007 bloquean todo.
- Historias 1 y 2 (T008–T011) antes que el resto: definen el periodo y la comparación que usan todas.
- T012 crea `report-insights.ts`; T016, T018 y T021 lo amplían (mismo archivo: en orden).
- `reports-page.tsx` lo tocan T009–T011, T015, T020, T023 y T025: en ese orden.
- Beta (fase 9) después de la comprobación del front (fase 8).

### En paralelo

- T003, T004 y T005; T008 con T012 y T013; T017, T019, T022 y T024 (componentes en archivos
  propios).

## Estrategia

1. MVP: fases 1–3 (comparación y periodo libre) y la historia 3 (no volvieron).
2. Luego historias 4–7 y la impresión.
3. Comprobación completa del front, después la beta, y el reporte final.

## Resultado

Ver el [reporte final](./reporte.md).
