# Cómo comprobarlo: Rediseño de la pantalla de acceso

Todo en local, con los datos demo. Nunca contra producción ni en Vercel.

## Preparación

En agenda-backend (API y base local con datos demo, puerto 4000):

```bash
npm run dev:local
```

En agenda-front (puerto 5173):

```bash
npm run dev
```

Cuentas demo: `jhordan@demo.com` (dueño de un negocio) y `admin@demo.com` (super admin), las dos
con la contraseña `demo1234`.

## Comprobaciones

| # | Qué hacer | Qué se espera | Cubre |
|---|---|---|---|
| 1 | Abrir `http://localhost:5173/login` en una ventana de escritorio | Etiqueta "Hola de nuevo", título con "agenda" en degradado, campos con icono y, a la derecha, el panel en degradado con el calendario y las tres etiquetas flotantes | Historias 1 y 2 · RF-001, 002, 003, 005 |
| 2 | Reducir la ventana a unos 1355 × 715 px | El panel se ve entero, sin cortes ni barra de desplazamiento; sin los tres datos de abajo | CE-002 · RF-007 |
| 3 | Agrandar la ventana a más de 860 px de alto | Aparecen 24/7 · Gratis · Sin cuenta debajo del calendario | RF-007 |
| 4 | Entrar con `jhordan@demo.com` / `demo1234` | Llega al panel del negocio como siempre | CE-003 · RF-004 |
| 5 | Salir y entrar con una contraseña incorrecta | El mismo mensaje de error de hoy, arriba del formulario | RF-004 |
| 6 | Activar la verificación en dos pasos de `admin@demo.com` en `/admin/settings`, salir y volver a entrar | Aparece el paso del código con el estilo nuevo; entra con el código de la app y "Volver" lleva a la contraseña | Historia 1 · CE-003 |
| 7 | Abrir `/register` y desplazar el formulario | Etiqueta "Gratis para empezar", título con "gratis" en degradado; el panel derecho se queda fijo | Historia 4 · RF-008, 010 |
| 8 | Cerrar el registro público desde el super admin y abrir `/register` | Aviso de registro cerrado con el estilo nuevo y el contacto de soporte | Historia 4 |
| 9 | Abrir `/forgot-password` | Tarjeta blanca con el email de soporte (y WhatsApp si está configurado) | Historia 4 |
| 10 | Debajo del formulario de `/login` | Nota: para reservar no hace falta cuenta, basta el enlace del profesional | Historia 5 · RF-011 |
| 11 | Recorrer `/login`, `/register` y `/forgot-password` a 320 y 390 px de ancho (Safari o el simulador del navegador) | Sin panel, fondo con degradado sutil, nada se sale de la pantalla | Historia 3 · CE-001 · RF-009 |
| 12 | Activar "Reducir movimiento" en el sistema y recargar `/login` | Todo aparece sin animaciones | RF-012 |
| 13 | Recorrer `/login` con el tabulador | El foco pasa por los campos, "Recordarme", "¿Olvidaste tu contraseña?", el botón y los enlaces; nunca entra al panel | RF-013 |
| 14 | Medir el contraste del texto del panel y del formulario | Al menos 4,5:1 en todos los textos | CE-004 · RF-014 |

Al terminar, desactivar la verificación de `admin@demo.com` y volver a abrir el registro si se
cerró (o recargar la demo con `npm run dev:local -- --reset`).

## Comprobación automática (la hace el asistente)

- `npm run build` y `npm run lint` en agenda-front, sin errores.
- Un script de Playwright (fuera del repo) que mide el desplazamiento horizontal a 320 y 390 px en
  WebKit, toma capturas a 1355 × 715 y 1440 × 900 y comprueba que el panel cabe en la ventana.
- Los servidores de prueba usan otros puertos y se detienen por puerto: 4000, 5173 y 3000 son los
  del dueño del producto.
