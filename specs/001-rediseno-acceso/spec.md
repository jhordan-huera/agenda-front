# Especificación: Rediseño de la pantalla de acceso

**Carpeta**: `specs/001-rediseno-acceso` (rama de trabajo: `dev`)

**Creada**: 2026-10-13

**Estado**: Implementada (2026-10-13)

**Pedido**: "dame mejorando esta interface con la skill por favor" (captura de la pantalla de
inicio de sesión en escritorio: formulario a la izquierda y la semana de ejemplo en una tarjeta
gris a la derecha).

## Escenarios de uso y pruebas *(obligatorio)*

### Historia 1 - Iniciar sesión en una pantalla al nivel de la portada (Prioridad: P1)

Un profesional que ya tiene cuenta entra a `/login`. Hoy la pantalla funciona, pero se ve plana y
con el estilo anterior: no se parece a la portada nueva. Debe encontrar una pantalla moderna y
coherente con la portada, con el formulario claro y cómodo de usar, y entrar como siempre (también
con la verificación en dos pasos).

**Por qué esta prioridad**: es la pantalla que todo usuario ve cada vez que entra y la primera
impresión después de la portada.

**Prueba independiente**: abrir `/login`, iniciar sesión con una cuenta demo (con y sin
verificación en dos pasos) y comprobar que se entra al panel igual que antes, con el aspecto nuevo.

**Escenarios de aceptación**:

1. **Dado** un visitante en `/login`, **cuando** carga la página, **entonces** ve la misma
   identidad que la portada: letra Sora, etiqueta en píldora sobre el título, el final del título
   en el degradado azul → lila y campos y botón más amplios.
2. **Dado** un email y una contraseña correctos, **cuando** pulsa "Iniciar sesión", **entonces**
   entra a su panel como hoy.
3. **Dado** una contraseña incorrecta, **cuando** pulsa "Iniciar sesión", **entonces** ve el mismo
   mensaje de error de hoy, visible encima del formulario.
4. **Dada** una cuenta con verificación en dos pasos, **cuando** la contraseña es correcta,
   **entonces** ve el paso del código con el estilo nuevo y puede volver o usar un código de
   recuperación como hoy.

---

### Historia 2 - Ver lo que hace Agenda360 junto al formulario (Prioridad: P2)

En escritorio, el lado derecho deja de ser una tarjeta gris y pasa a ser un panel en el degradado
de la marca con un titular corto, el calendario de la semana de la portada (citas por estado y la
reserva que entra el jueves a las 10:00) y las etiquetas flotantes de lo que pasa solo: "Nueva
reserva online", "Confirmación enviada" y "Recordatorio".

**Por qué esta prioridad**: da el aspecto SaaS pedido y recuerda el valor del producto, pero el
acceso funciona sin él.

**Prueba independiente**: abrir `/login` en una ventana de escritorio y comprobar que el panel se
ve completo, con las animaciones de entrada, y que no se puede llegar a él con el tabulador.

**Escenarios de aceptación**:

1. **Dada** una ventana de escritorio (desde 1024 px de ancho), **cuando** carga `/login`,
   **entonces** el panel derecho muestra el titular, el calendario y las tres etiquetas flotantes.
2. **Dada** una ventana baja (unos 700 px de alto, como un portátil), **cuando** carga `/login`,
   **entonces** el panel se ve entero, sin cortes ni barra de desplazamiento.
3. **Dada** una ventana alta, **cuando** carga `/login`, **entonces** debajo del calendario se ven
   además los tres datos ciertos de la portada (24/7 reservas online, gratis para empezar, tus
   clientes reservan sin cuenta).
4. **Dado** "reducir movimiento" activado en el sistema, **cuando** carga `/login`, **entonces**
   todo aparece sin animaciones.

---

### Historia 3 - Acceder desde el celular (Prioridad: P2)

En el celular no cabe el panel: se ve sólo el formulario, sobre un fondo con un toque sutil del
degradado de la marca, sin nada que se salga de la pantalla.

**Por qué esta prioridad**: muchos profesionales entran desde el celular (la app es instalable).

**Prueba independiente**: abrir `/login`, `/register` y `/forgot-password` a 390 px y a 320 px de
ancho (motor de Safari) y comprobar que no hay desplazamiento horizontal y que todo se puede tocar.

**Escenarios de aceptación**:

1. **Dado** un celular de 390 px, **cuando** abre `/login`, **entonces** ve el logotipo, el
   formulario completo y el pie, sin desplazamiento horizontal.
2. **Dado** un celular de 320 px, **cuando** abre `/register`, **entonces** los campos ocupan el
   ancho disponible y nada se corta.

---

### Historia 4 - Pantallas de registro y recuperación con el mismo marco (Prioridad: P2)

"Crear cuenta", "El registro está cerrado" y "¿Olvidaste tu contraseña?" comparten el marco de la
pantalla de acceso y deben verse con el mismo estilo nuevo.

**Por qué esta prioridad**: si sólo cambia el login, el salto al registro o a la recuperación se
nota como otra aplicación.

**Prueba independiente**: recorrer `/register` (abierto y cerrado) y `/forgot-password` y
comprobar el mismo estilo; en escritorio, al desplazar el formulario de registro, el panel derecho
se queda fijo.

**Escenarios de aceptación**:

1. **Dado** el registro abierto, **cuando** se abre `/register`, **entonces** ve el título con su
   etiqueta y su parte en degradado, los campos amplios y el panel derecho fijo al desplazar.
2. **Dado** el registro cerrado por el super admin, **cuando** se abre `/register`, **entonces**
   ve el aviso de registro cerrado con el estilo nuevo y el contacto de soporte como hoy.
3. **Dado** `/forgot-password`, **cuando** se abre, **entonces** ve el contacto de soporte (email
   y WhatsApp si existe) en una tarjeta con el estilo nuevo, como hoy.

---

### Historia 5 - Orientar al paciente que llega al login (Prioridad: P3)

A veces un paciente llega a `/login` buscando cómo reservar. Debajo del formulario ve una nota
breve: para reservar no necesita cuenta, basta el enlace que le compartió su profesional.

**Por qué esta prioridad**: evita confusiones y consultas al soporte, pero es un añadido menor.

**Prueba independiente**: abrir `/login` y comprobar que la nota se lee debajo del formulario sin
competir con él.

**Escenarios de aceptación**:

1. **Dado** un visitante en `/login`, **cuando** mira debajo del formulario, **entonces** lee que
   para reservar una cita no necesita cuenta y que use el enlace de su profesional.

---

### Casos límite

- Ventana de escritorio baja (unos 700 px de alto): el panel cabe entero; los tres datos de la
  portada sólo aparecen si hay altura.
- Formulario de registro más alto que la ventana: se desplaza el formulario y el panel se queda
  fijo.
- Ventana entre 1024 y 1280 px de ancho: el calendario sigue mostrando los seis días sin cortar
  nombres ni horas de forma ilegible.
- Error de credenciales, cuenta bloqueada por intentos o código de verificación incorrecto: los
  mensajes de hoy siguen viéndose arriba del formulario.
- Colores de marca: la pantalla usa los colores del tema (los de la plataforma); si algún día se
  aplican los de un negocio, debe verse bien igual.
- Aviso rojo de "Base de PRODUCCIÓN" (sólo en desarrollo local): sigue visible y no tapa el
  formulario.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **RF-001**: La pantalla de acceso DEBE usar la identidad de la portada nueva: letra Sora,
  degradado azul → lila de la marca, tarjetas blancas redondeadas y etiquetas en píldora.
- **RF-002**: El título de cada pantalla DEBE llevar una etiqueta en píldora encima y su parte
  final en el degradado de la marca (login: "Hola de nuevo" · "Inicia sesión en tu
  *agenda*"; registro: "Gratis para empezar" · "Crea tu cuenta *gratis*").
- **RF-003**: Los campos de email y contraseña DEBEN ser más altos (al menos 44 px, cómodos al
  tacto) y llevar un icono a la izquierda; el botón principal DEBE ocupar el ancho del formulario.
- **RF-004**: El inicio de sesión DEBE comportarse exactamente igual que hoy: validaciones,
  mensajes de error, bloqueo por intentos, "Recordarme", "¿Olvidaste tu contraseña?", mostrar u
  ocultar la contraseña, verificación en dos pasos (código de la app o de recuperación) y destino
  al entrar.
- **RF-005**: En escritorio (desde 1024 px de ancho) el lado derecho DEBE ser un panel en el
  degradado de la marca con un titular corto, el calendario de la semana de la portada y las tres
  etiquetas flotantes ("Nueva reserva online", "Confirmación enviada", "Recordatorio").
- **RF-006**: El panel DEBE mostrar sólo datos de ejemplo de la portada y hechos ciertos del
  producto: nada de testimonios, cifras de usuarios ni precios.
- **RF-007**: El panel DEBE caber entero en ventanas desde unos 700 px de alto; los tres datos de
  la portada (24/7, Gratis, Sin cuenta) sólo se muestran cuando hay altura para ellos.
- **RF-008**: En escritorio el panel DEBE quedarse fijo mientras se desplaza un formulario más
  alto que la ventana (registro).
- **RF-009**: En el celular (menos de 1024 px de ancho) el panel NO se muestra; el formulario va
  sobre un fondo con un degradado sutil de la marca y nada se sale de la pantalla entre 320 y
  1023 px de ancho.
- **RF-010**: "Crear cuenta", "El registro está cerrado" y "¿Olvidaste tu contraseña?" DEBEN usar
  el mismo marco y estilo; su contenido y comportamiento no cambian.
- **RF-011**: El login DEBE mostrar debajo del formulario una nota breve para pacientes: para
  reservar no necesitan cuenta, basta el enlace de su profesional.
- **RF-012**: Las animaciones de entrada DEBEN ser suaves y desaparecer con "reducir movimiento".
- **RF-013**: El panel es decorativo: NO DEBE recibir el foco con el tabulador y DEBE tener una
  descripción corta para lectores de pantalla.
- **RF-014**: Los textos DEBEN tener contraste suficiente (al menos 4,5:1), también el texto
  blanco sobre el degradado.
- **RF-015**: Los colores DEBEN salir de los colores del tema (sin colores fijos que ignoren la
  marca).
- **RF-016**: El cambio NO DEBE tocar la API ni requerir migración.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **CE-001**: 0 px de desplazamiento horizontal en `/login`, `/register` y `/forgot-password` a
  320 px y 390 px de ancho.
- **CE-002**: En una ventana de 1355 × 715 px (la del dueño del producto) el panel derecho se ve
  completo, sin cortes, junto al formulario.
- **CE-003**: Se entra al panel con una cuenta demo sin verificación y con otra con verificación en
  dos pasos, igual que antes del cambio.
- **CE-004**: Todos los textos de las pantallas de acceso tienen un contraste de al menos 4,5:1.
- **CE-005**: El dueño del producto aprueba el aspecto comparándolo con la portada.

## Supuestos

- Sólo cambia el front (agenda-front); la API y la base no se tocan.
- La beta (`agenda-beta`) no se incluye.
- El panel reutiliza el calendario de ejemplo de la portada (semana del 5 al 10 de octubre, la
  reserva de Ana Torres) para que portada y acceso cuenten lo mismo.
- El panel usa el degradado de la marca, como la llamada final de la portada (se eligió frente a un
  panel claro porque contrasta mejor con el formulario blanco).
- En la pantalla de acceso no hay negocio elegido: siempre se ven los colores de la plataforma
  (los del negocio se quitan al salir del panel).
- La tarjeta gris actual con la semana (estilo anterior) deja de usarse.
