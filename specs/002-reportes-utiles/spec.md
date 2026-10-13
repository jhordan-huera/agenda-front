# Especificación: Reportes útiles

**Carpeta**: `specs/002-reportes-utiles` (rama de trabajo: `dev`)

**Creada**: 2026-10-13

**Estado**: Implementada (2026-10-13)

**Pedido**: "quiero que en mi sistema me genere reportes pero no sé qué más mostrar, porque lo que
se muestra es muy poco relevante". Elecciones del dueño del producto: comparación con el periodo
anterior; pacientes que no volvieron, reservas por la página, los que más vienen y más faltan;
días y horas más pedidos, ocupación del horario; elegir mes o fechas, imprimir o PDF.

## Escenarios de uso y pruebas *(obligatorio)*

### Historia 1 - Saber si voy mejor o peor (Prioridad: P1)

El profesional abre Reportes y cada cifra principal (ingresos, citas, completadas,
cancelaciones, no asistió, asistencia, pacientes nuevos y recurrentes) muestra cuánto cambió
frente al periodo anterior del mismo largo, con una flecha y el porcentaje.

**Por qué esta prioridad**: hoy las cifras están sueltas; sin comparación no dicen nada.

**Prueba independiente**: con citas en dos meses seguidos, elegir el segundo y comprobar que
cada cifra muestra la diferencia correcta con el primero.

**Escenarios de aceptación**:

1. **Dado** el periodo "30 días", **cuando** abre Reportes, **entonces** cada cifra principal
   muestra "▲ 18 %" o "▼ 5 %" frente a los 30 días anteriores.
2. **Dado** un aumento de cancelaciones o de faltas, **cuando** lo ve, **entonces** el cambio se
   marca como negativo (aunque el número suba), y un aumento de ingresos o asistencia como positivo.
3. **Dado** un periodo anterior sin datos, **cuando** lo ve, **entonces** dice "sin datos para
   comparar" en lugar de un porcentaje.

---

### Historia 2 - Elegir el mes o las fechas del reporte (Prioridad: P1)

Además de 7, 30 y 90 días, puede elegir un mes concreto (para el cierre del mes) o un rango de
fechas.

**Por qué esta prioridad**: el cierre mensual es el reporte que más se usa, y la comparación de la
historia 1 tiene más sentido mes contra mes.

**Prueba independiente**: elegir "septiembre 2026" y un rango del 1 al 15 de octubre, y comprobar
que todas las cifras, gráficos y listas cambian a ese periodo.

**Escenarios de aceptación**:

1. **Dado** "Mes", **cuando** elige septiembre 2026, **entonces** el reporte cubre del 1 al 30 de
   septiembre y compara con agosto.
2. **Dado** el mes en curso, **cuando** lo elige, **entonces** compara con los mismos días del mes
   anterior (del 1 al 13 de septiembre si hoy es 13 de octubre).
3. **Dado** "Fechas", **cuando** elige del 1 al 15 de octubre, **entonces** compara con los 15 días
   anteriores.
4. **Dado** un rango de más de un año, **cuando** intenta elegirlo, **entonces** no se permite y se
   explica el límite.

---

### Historia 3 - Recuperar a los pacientes que no volvieron (Prioridad: P1)

Ve la lista de pacientes que vinieron alguna vez pero no tienen cita desde hace tiempo (60 días por
defecto; puede elegir 30, 60 o 90) ni una próxima cita, con su última visita y un botón para
escribirles por WhatsApp.

**Por qué esta prioridad**: es lo más accionable: cada paciente recuperado es ingreso.

**Prueba independiente**: con un paciente cuya última cita fue hace 70 días y sin cita futura,
comprobar que aparece con 60 días y no con 90, y que el botón abre WhatsApp con un mensaje.

**Escenarios de aceptación**:

1. **Dado** un paciente con última cita hace 70 días y ninguna próxima, **cuando** el umbral es 60
   días, **entonces** aparece con la fecha de su última visita y cuántas veces vino.
2. **Dado** un paciente con una cita próxima, **cuando** se mira la lista, **entonces** no aparece.
3. **Dado** un paciente con teléfono, **cuando** pulsa "Escribir por WhatsApp", **entonces** se abre
   WhatsApp con un saludo editable que lo invita a reservar con el enlace de la página de reservas.
4. **Dado** un paciente sin teléfono, **cuando** se mira la lista, **entonces** no tiene botón de
   WhatsApp, pero sí el enlace a su ficha.

---

### Historia 4 - Ver cuánto trae la página de reservas (Prioridad: P2)

Ve cuántas citas del periodo llegaron solas por la página de reservas frente a las creadas desde el
panel, y cuántos pacientes nuevos llegaron por la página.

**Por qué esta prioridad**: muestra el valor de compartir el enlace y anima a usarlo.

**Prueba independiente**: con 6 citas de la página y 4 del panel, comprobar "6 de 10 (60 %)" y su
comparación con el periodo anterior.

**Escenarios de aceptación**:

1. **Dado** citas de los dos orígenes, **cuando** se mira el bloque, **entonces** muestra cuántas y
   qué porcentaje llegaron por la página (sin contar canceladas).
2. **Dado** pacientes nuevos en el periodo, **cuando** su primera cita llegó por la página,
   **entonces** cuentan como "pacientes nuevos por tu página".

---

### Historia 5 - Pacientes que más vienen y que más faltan (Prioridad: P2)

Ve los 5 pacientes con más citas en el periodo (con lo que dejaron) y los 5 que más faltaron sin
avisar.

**Por qué esta prioridad**: ayuda a cuidar a los fieles y a hablar con quienes faltan.

**Prueba independiente**: con un paciente de 4 citas y otro con 2 faltas, comprobar que encabezan
cada lista.

**Escenarios de aceptación**:

1. **Dado** el periodo, **cuando** se mira "Los que más vienen", **entonces** salen hasta 5
   pacientes ordenados por citas no canceladas, con el total cobrado en completadas.
2. **Dado** faltas en el periodo, **cuando** se mira "Los que más faltan", **entonces** salen hasta
   5 pacientes con al menos una falta, con cuántas y su asistencia.
3. **Dado** que nadie faltó, **cuando** se mira esa lista, **entonces** dice que nadie faltó.

---

### Historia 6 - Días y horas más pedidos (Prioridad: P2)

Ve un mapa de calor con los días de la semana y las horas del día: cuanto más oscuro, más citas
empiezan a esa hora.

**Por qué esta prioridad**: ayuda a decidir cuándo abrir más horas y cuándo sobra tiempo.

**Prueba independiente**: con varias citas el martes a las 10:00, comprobar que esa celda es la más
oscura y que su número se lee al pasar o tocar.

**Escenarios de aceptación**:

1. **Dado** citas en el periodo, **cuando** se mira el mapa, **entonces** cada celda (día y hora)
   muestra cuántas citas no canceladas empiezan en ella, con la intensidad del color según el
   número.
2. **Dado** un lector de pantalla, **cuando** llega al mapa, **entonces** puede leer los números
   como una tabla.
3. **Dado** un celular, **cuando** se mira el mapa, **entonces** se lee sin salirse de la pantalla.

---

### Historia 7 - Ocupación del horario también con una sola agenda (Prioridad: P2)

Ve qué parte de sus horas de trabajo se llenó con citas en el periodo, también si sólo tiene una
agenda (hoy sólo se ve con varias).

**Por qué esta prioridad**: dice si tiene espacio para más pacientes o si está lleno.

**Prueba independiente**: con un horario de 40 h en la semana y 10 h de citas, comprobar "25 %".

**Escenarios de aceptación**:

1. **Dado** un negocio con una sola agenda, **cuando** abre Reportes, **entonces** ve su ocupación
   y su comparación con el periodo anterior.
2. **Dado** varias agendas y "Todos los profesionales", **cuando** abre Reportes, **entonces** ve la
   ocupación total y la tabla por profesional como hoy.

---

### Historia 8 - Imprimir o guardar en PDF (Prioridad: P3)

Desde Reportes pulsa "Imprimir o PDF" y obtiene una versión del reporte del periodo elegido lista
para imprimir o guardar como PDF, con el nombre y el logo del negocio, el periodo y el profesional.

**Por qué esta prioridad**: sirve para archivar el cierre o compartirlo con un socio.

**Prueba independiente**: elegir octubre y pulsar "Imprimir o PDF"; comprobar que la vista previa
de impresión muestra el reporte completo, sin menú ni botones.

**Escenarios de aceptación**:

1. **Dado** un periodo elegido, **cuando** pulsa "Imprimir o PDF", **entonces** se abre el diálogo
   de impresión del navegador con el reporte de ese periodo y ese profesional.
2. **Dado** la versión impresa, **cuando** se mira, **entonces** lleva las cifras con su
   comparación, los gráficos y las listas de pacientes sin teléfonos ni emails.

---

### Casos límite

- Negocio sin citas: los bloques muestran un estado vacío que explica qué aparecerá.
- Periodo anterior antes de que existiera el negocio: "sin datos para comparar".
- Profesional con permiso "sólo sus pacientes": ve sólo sus citas y sus pacientes, como hoy.
- Pacientes con datos restringidos (reserva online aún no gestionada): aparecen sin contacto y sin
  botón de WhatsApp.
- Pacientes desactivados: no aparecen en "no volvieron".
- Mes en curso: el reporte cubre del día 1 a hoy y se compara con los mismos días del mes anterior
  (el total del mes con lo ya agendado sigue en "Este mes").
- Rango que llega al futuro: las citas ya agendadas cuentan (ingresos estimados) y se compara con
  el rango anterior del mismo largo.
- Rangos largos (hasta un año): las cifras y gráficos siguen siendo legibles (el gráfico de volumen
  se agrupa por semana o por mes).
- Ocupación sin horario configurado: "—" con una nota para configurar el horario.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **RF-001**: Cada cifra principal DEBE mostrar su cambio frente al periodo anterior del mismo
  largo: flecha, porcentaje y si el cambio es bueno o malo según la cifra.
- **RF-002**: Si el periodo anterior no tiene datos, DEBE decir "sin datos para comparar".
- **RF-003**: El periodo DEBE poder ser 7, 30 o 90 días, un mes concreto (los últimos 24 meses) o
  un rango de fechas de hasta 366 días.
- **RF-004**: Para un mes, la comparación DEBE ser con el mes anterior; para el mes en curso, con
  los mismos días del mes anterior; para un rango, con el rango anterior del mismo largo.
- **RF-005**: DEBE listar los pacientes activos con al menos una cita pasada no cancelada, sin cita
  futura y cuya última cita fue hace más del umbral elegido (30, 60 o 90 días; 60 por defecto), con
  su última visita, cuántas veces vino y un acceso a su ficha.
- **RF-006**: Cada paciente de esa lista con teléfono DEBE tener "Escribir por WhatsApp" con un
  mensaje editable que lo invite a reservar e incluya el enlace de la página de reservas.
- **RF-007**: DEBE mostrar cuántas citas no canceladas del periodo llegaron por la página de
  reservas y su porcentaje, y cuántos pacientes nuevos llegaron por la página, con comparación.
- **RF-008**: DEBE mostrar hasta 5 pacientes con más citas no canceladas en el periodo (con lo
  cobrado en completadas) y hasta 5 con más faltas (con su asistencia).
- **RF-009**: DEBE mostrar un mapa de calor de citas no canceladas por día de la semana y hora de
  inicio, con el número de cada celda accesible por tabla para lectores de pantalla.
- **RF-010**: DEBE mostrar la ocupación del horario del periodo (horas con citas sobre horas de
  trabajo, sin bloqueos) con una o varias agendas, con comparación.
- **RF-011**: El filtro de profesional DEBE aplicarse a todas las cifras, gráficos y listas del
  periodo; "no volvieron" considera todas las citas del paciente en el negocio.
- **RF-012**: "Imprimir o PDF" DEBE producir una versión del reporte sin menú ni botones, con nombre
  y logo del negocio, periodo, profesional elegido, cifras con comparación, gráficos y listas, sin
  teléfonos ni emails de pacientes.
- **RF-013**: Lo que ya muestra Reportes (ingresos de hoy, semana y mes, gráfico de volumen,
  estados, servicios más reservados, tabla por profesional) DEBE seguir disponible.
- **RF-014**: Todo DEBE verse sin desplazamiento horizontal en el celular (320–414 px).
- **RF-015**: Los permisos no cambian: Reportes sigue requiriendo el permiso de reportes y cada
  usuario ve sólo lo que hoy puede ver.
- **RF-016**: Los colores DEBEN salir del tema del negocio (sus colores de marca).
- **RF-017**: La beta (`agenda-beta`, con sus datos de prueba) DEBE tener los mismos reportes, con
  el mismo aspecto y comportamiento (pedido del dueño del producto al aprobar el plan).

### Entidades clave

- **Periodo**: fecha de inicio y fin, tipo (días, mes o rango) y su periodo de comparación.
- **Comparación**: valor actual, valor anterior, cambio en porcentaje y si es favorable.
- **Paciente a recuperar**: paciente, última visita, veces que vino, teléfono si lo tiene.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **CE-001**: Con datos de prueba conocidos, el 100 % de las cifras y sus comparaciones coinciden
  con el cálculo a mano.
- **CE-002**: Cambiar de periodo (incluido un año) muestra el reporte en menos de 2 segundos en
  local.
- **CE-003**: Desde la lista de "no volvieron" se abre WhatsApp con el mensaje en un toque.
- **CE-004**: 0 px de desplazamiento horizontal en Reportes a 320 y 390 px.
- **CE-005**: La vista de impresión de un mes cabe en páginas A4 sin cortes de tarjetas a la mitad.
- **CE-006**: El dueño del producto encuentra el reporte más útil que el actual (aprobación).
- **CE-007**: En la beta, las comprobaciones 1–14 del quickstart dan el mismo resultado con sus
  datos de prueba.

## Supuestos

- Se calcula con los datos que ya guarda el sistema (origen de cada cita, estado, precio, horario,
  primera, última y próxima cita de cada paciente); no hace falta migración.
- Fuera de alcance por elección del dueño del producto: cobrado y por cobrar, ticket promedio y por
  modalidad, cancelaciones de último momento y la descarga en Excel.
- "Más vienen" y "más faltan" usan el periodo elegido; "no volvieron" usa todo el historial.
- La versión impresa lleva nombres de pacientes (es información del propio negocio) pero no sus
  teléfonos ni emails, porque el papel o el PDF pueden circular.
- El PDF se obtiene con "Guardar como PDF" del diálogo de impresión del navegador (sin servicios
  externos).
- La beta (`agenda-beta`) se incluye: calcula lo mismo con las citas que guarda en el navegador.
