# Cómo comprobarlo: Reportes útiles

Todo en local, con los datos demo. Nunca contra producción ni en Vercel.

## Preparación

En agenda-backend:

```bash
npm run dev:local
```

En agenda-front:

```bash
npm run dev
```

Entrar con `jhordan@demo.com` / `demo1234` (una agenda) o con la cuenta de la clínica demo (varias
agendas) y abrir **Reportes**.

## Comprobaciones

| # | Qué hacer | Qué se espera | Cubre |
|---|---|---|---|
| 1 | Abrir Reportes con "30 días" | Cada cifra con ▲/▼ y porcentaje frente a los 30 días anteriores; cancelaciones y no asistió en rojo si suben | H1 · RF-001 |
| 2 | Elegir "Mes" → el mes pasado | Cubre del 1 al último día y compara con el mes anterior | H2 · RF-003, 004 |
| 3 | Elegir "Mes" → el mes en curso | Del 1 a hoy, comparado con los mismos días del mes anterior | H2 · RF-004 |
| 4 | Elegir "Fechas" con más de un año o al revés | Aviso y el reporte no cambia | H2 · RF-003 |
| 5 | Mirar "Pacientes que no volvieron" con 30, 60 y 90 días | La lista cambia; nadie con cita futura; cada uno con última visita y veces | H3 · RF-005 |
| 6 | Pulsar "Escribir por WhatsApp" | Abre WhatsApp con el saludo y el enlace de reservas | H3 · RF-006 · CE-003 |
| 7 | Mirar "Reservas por tu página" | Citas por la página y por el panel, porcentaje y nuevos por la página, con tendencia | H4 · RF-007 |
| 8 | Mirar "Los que más vienen" y "Los que más faltan" | Hasta 5 en cada una, ordenados | H5 · RF-008 |
| 9 | Mirar "Días y horas más pedidos" | Las horas con más citas, más oscuras y con su número | H6 · RF-009 |
| 10 | Con una sola agenda, mirar la cifra "Ocupación" | Porcentaje y tendencia | H7 · RF-010 |
| 11 | Con varias agendas, elegir un profesional | Todas las cifras, gráficos y listas del periodo cambian a su agenda | RF-011 |
| 12 | Pulsar "Imprimir o PDF" y ver la vista previa | Logo, negocio, periodo; sin menú ni botones ni teléfonos; tarjetas enteras | H8 · RF-012 · CE-005 |
| 13 | Abrir Reportes en el celular (390 px y 320 px) | Nada se sale de la pantalla; el mapa de calor se lee | RF-014 · CE-004 |
| 14 | Elegir un rango de un año | El reporte aparece en menos de 2 s; el gráfico se agrupa por mes | CE-002 |

## Comprobación automática (la hace el asistente)

- `npm run build` y `npm run lint` sin errores.
- Playwright contra la API y la base locales de prueba (otros puertos): lee las cifras de la página
  y las compara con consultas SQL sobre la misma base (CE-001); prepara un paciente con 70 días sin
  venir y comprueba que aparece con 60 y no con 90; mide el desborde a 320 y 390 px; genera el PDF
  de impresión y revisa que no tenga teléfonos.
