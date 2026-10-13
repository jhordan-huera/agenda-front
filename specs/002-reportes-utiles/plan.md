# Plan de implementación: Reportes útiles

**Rama**: `dev` · **Fecha**: 2026-10-13 · **Spec**: [spec.md](./spec.md)

**Entrada**: especificación aprobada en `specs/002-reportes-utiles/spec.md`

## Resumen

Reportes pasa de cifras sueltas a un reporte que se compara con el periodo anterior y dice qué
hacer:
- periodo libre (días, mes o fechas);
- tendencia en cada cifra;
- reservas por la página;
- ocupación también con una sola agenda;
- mapa de días y horas;
- pacientes que más vienen, que más faltan y que no volvieron (con WhatsApp);
- versión para imprimir o guardar en PDF.

Todo se calcula en el front con los datos que ya da la API: sin cambios en el backend ni migración.
Ver [research.md](./research.md).

## Contexto técnico

**Lenguaje/versión**: TypeScript 6 + React 19

**Dependencias principales**: TanStack Query, recharts (ya instalado), Tailwind v4, shadcn/Radix,
date-fns. Ninguna dependencia nueva.

**Almacenamiento**: no aplica (lee `GET /appointments`, `GET /clients/activity`, `GET /clients`,
horarios y bloqueos, como hoy).

**Pruebas**: `npm run build` y `npm run lint`. Verificación con Playwright contra la API y la base
locales (datos demo y casos preparados), comparando cifras con consultas SQL.

**Plataforma**: web (escritorio, celular e impresión A4).

**Tipo de proyecto**: aplicación web (este repo: front).

**Objetivos de rendimiento**: el reporte de un año con su comparación, en menos de 2 s en local
(CE-002).

**Restricciones**: sin desborde a 320 px; contraste ≥ 4,5:1; impresión sin teléfonos ni emails.

**Alcance**: 1 página reescrita, 3 archivos de cálculos (1 ampliado y 2 nuevos), 6 componentes
nuevos y 2 ampliados; lo mismo en la beta.

## Comprobación contra la constitución

| Principio | Cumple | Cómo |
|---|---|---|
| I. Todo en español | Sí | Textos, mensaje de WhatsApp y artefactos en español. |
| II. Privacidad | Sí | Sólo los datos que el usuario ya puede ver; la impresión no lleva teléfonos ni emails; nada sale a servicios externos (el PDF lo hace el navegador). |
| III. Decisiones de producto | Sí | Sin precios ni planes; los permisos y el alcance por agenda no cambian. |
| IV. Se comprueba en local | Sí | Build, lint y Playwright + SQL en la base local. |
| V. Código compartido | Sí | No toca tipos, validaciones ni plantillas compartidas con el backend. |
| VI. Sencillo y barato | Sí | Sin dependencias nuevas; una petición de citas por periodo, como hoy. |
| VII. Diseño | Sí | Tokens de la marca; verde y rojo semánticos sólo para "mejor/peor" (con flecha y texto); `grid-cols-1` de base; tablas accesibles. |

Sin infracciones.

## Estructura del proyecto

### Documentación (esta función)

```text
specs/002-reportes-utiles/
├── spec.md · plan.md · research.md · quickstart.md
├── contracts/calculos.md   # Firmas de los cálculos y componentes nuevos
├── checklists/requirements.md
└── tasks.md                # Lo genera /speckit-tasks
```

No hay `data-model.md`: no hay datos nuevos (las "entidades" de la spec son valores calculados,
descritos en el contrato).

### Código (agenda-front)

```text
src/
├── features/
│   ├── dashboard/
│   │   └── metric-strip.tsx            # CAMBIA: `trend` opcional por cifra
│   └── reports/
│       ├── report-period.ts            # NUEVO: periodos (días/mes/rango), comparación y carga
│       ├── report-stats.ts             # CAMBIA: granularidad día/semana/mes; ocupación total
│       ├── report-insights.ts          # NUEVO: canales, mapa de calor, top pacientes, no volvieron
│       ├── period-picker.tsx           # NUEVO: pestañas + mes + fechas
│       ├── trend.tsx                   # NUEVO: ▲▼ con color semántico y texto accesible
│       ├── demand-heatmap.tsx          # NUEVO: tabla de días y horas
│       ├── booking-channels-card.tsx   # NUEVO: página vs panel y nuevos por la página
│       ├── top-clients-cards.tsx       # NUEVO: más vienen y más faltan
│       ├── lapsed-clients-card.tsx     # NUEVO: no volvieron + WhatsApp + umbral
│       ├── print-header.tsx            # NUEVO: encabezado sólo para imprimir
│       └── appointments-volume-chart.tsx  # CAMBIA: granularidad y ajuste al imprimir
├── lib/
│   └── whatsapp.ts                     # CAMBIA: mensaje "te extrañamos" para recuperar pacientes
└── pages/dashboard/
    └── reports-page.tsx                # CAMBIA: nuevo orden, periodo, tendencias, bloques, imprimir
```

**Decisión de estructura**: los cálculos siguen siendo funciones puras separadas de la vista
(como `report-stats.ts`), divididos en periodo e indicadores para que ningún archivo crezca de
más. Cada bloque nuevo es un componente en `features/reports`.

## Diseño (fase 1)

### Orden de la página

1. Cabecera: título, periodo ("Del 1 al 13 de octubre · comparado con el 1 al 13 de septiembre"),
   selector de periodo, profesional (con varias agendas) y botón "Imprimir o PDF".
2. Ingresos (bloque actual) con tendencia en "Ingresos estimados" y "Cobrado".
3. Cifras (6): citas, completadas, cancelaciones, no asistió (con asistencia), ocupación y "por
   tu página", cada una con su tendencia.
4. Gráfico de volumen (día, semana o mes).
5. Tabla por profesional (varias agendas, "Todos"), como hoy.
6. Fila: "Días y horas más pedidos", "Reservas por tu página" y "Pacientes" (nuevos y recurrentes,
   con tendencia).
7. Fila: "Los que más vienen" y "Los que más faltan".
8. "Pacientes que no volvieron" (ancho completo; umbral 30/60/90).
9. Fila: "Distribución por estado" y "Servicios más reservados" (como hoy).

### Impresión

- `window.print()` desde el botón. Encabezado de impresión con logo, negocio, periodo, profesional y
  fecha de generación; sin menú, controles ni botones de WhatsApp; teléfonos ocultos; tarjetas sin
  cortarse a la mitad; gráficos al ancho de la hoja.

Firmas y comportamiento: [contracts/calculos.md](./contracts/calculos.md). Comprobación:
[quickstart.md](./quickstart.md).

## Beta (`agenda-beta`)

Pedida por el dueño del producto al aprobar el plan (RF-017).

- **Respaldo antes de tocarla** (no tiene git):
  `~/Documentos/Proyectos/Betas/agenda-beta-respaldo-antes-de-reportes-2026-10-13.tar.gz`, sin
  `node_modules` ni `dist`.
- **Archivos idénticos al front** (se copian tal cual): `report-period.ts`, `report-insights.ts`,
  `trend.tsx`, `period-picker.tsx`, `demand-heatmap.tsx`, `booking-channels-card.tsx`,
  `top-clients-cards.tsx`, `lapsed-clients-card.tsx`, `print-header.tsx`, y los cambios de
  `report-stats.ts`, `metric-strip.tsx`, `appointments-volume-chart.tsx` y `whatsapp.ts` (fusión:
  la beta tiene pequeñas diferencias propias en esos archivos y se conservan).
- **Adaptación en `reports-page.tsx` de la beta**: carga todas las citas de una vez (como hoy) y
  filtra el periodo en el navegador; la primera, última y próxima visita de cada paciente se
  calculan con esas citas (`summarizeClientVisits` en `report-insights.ts`, que el front no usa
  porque lo da la API).
- Para que `report-insights.ts` sea el mismo archivo en los dos proyectos, "no volvieron" recibe un
  resumen genérico por paciente (`ClientVisits`: última visita, veces, si tiene próxima cita); el
  front lo arma desde `clients/activity` y la beta desde sus citas.
- **Comprobación**: `npm run build` y `npm run lint` de la beta, y Playwright sobre su servidor de
  desarrollo en un puerto de prueba (nunca el 3000).

## Fuera de alcance

- Cobrado y por cobrar, ticket promedio y por modalidad, cancelaciones de último momento, Excel (no
  elegidos).
- API y base de datos.
- Reportes de la plataforma (super admin).

## Comprobación tras el diseño

Revisada la tabla con el diseño: sigue cumpliendo. Nota: la ocupación del periodo anterior se
calcula con el horario actual (igual que la ocupación de hoy); se explica en la descripción del
bloque.
