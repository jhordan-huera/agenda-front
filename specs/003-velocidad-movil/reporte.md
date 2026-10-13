# Reporte final: Velocidad en el celular

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tareas**: [tasks.md](./tasks.md)

**Estado**: Implementada en dev · **Fecha**: 2026-10-13

**Repos**: agenda-front · **Migración**: No

## Resumen

En el celular, la app ahora:
- **Muestra la pantalla de carga mucho antes**: 0,9 s en lugar de 1,7 s.
- **Abre la página de reservas casi un segundo antes**: 2,2 s en lugar de 3,0 s. Ya está por debajo
  de los 2,5 s que Google considera "bueno".
- **Descarga mucho menos en la página de reservas**: 283 KB en lugar de 731 KB, porque el mapa sólo
  se descarga si el paciente baja hasta él.

La portada y el login también cargan algo antes. Nada cambia en el aspecto ni en el funcionamiento.

## Qué se entrega

| Historia | Prioridad | Estado | Notas |
|---|---|---|---|
| H1 – Reservas antes | P1 | Hecha | Los datos del negocio se piden mientras carga la app |
| H2 – Mapa sólo al verlo | P1 | Hecha | Se descarga a 300 px de entrar en pantalla |
| H3 – Pantalla de carga al instante | P2 | Hecha | Hoja de estilos al final del `<body>` |
| H4 – Carga inicial más liviana | P2 | Hecha | Zod fuera del paquete inicial (141 → 120 KB) |

## Comprobación

Medido en local con la app compilada como en producción: HTTP/2, brotli, las cabeceras de
`vercel.json` y la API con 0,8 s de retraso, como la de producción. El celular se simuló con 390 px,
CPU 4× más lenta y 4G lenta (1,6 Mbps, 150 ms). Mediana de 5 cargas; la versión anterior se compiló
y se midió igual.

| Página | FCP antes → ahora | LCP antes → ahora | Descarga antes → ahora |
|---|---|---|---|
| Portada | 1,7 → 0,9 s | 1,7 → 1,6 s | 243 → 221 KB |
| Login | 1,7 → 0,9 s | 1,7 → 1,6 s | 243 → 245 KB |
| Reservas con mapa | 1,6 → 0,9 s | 3,0 → 2,2 s | 731 → 283 KB |
| Reservas sin mapa | 1,6 → 0,9 s | 3,0 → 2,2 s | 286 → 287 KB |

CLS 0 en todas. El bloqueo del hilo principal (TBT) baja de unos 20 ms a menos de 7 ms.

| Requisito o criterio | Resultado | Cómo se comprobó |
|---|---|---|
| RF-001 – Datos de reservas por adelantado | Cumple | Cascada de peticiones: el perfil sale a los 0,35 s, antes de que termine la app; la página pide el perfil una sola vez |
| RF-002 – Mapa al verlo | Cumple | Sin bajar: no se descarga MapLibre; al bajar a "Cómo llegar" aparece el mapa |
| RF-003 – Pantalla de carga sin esperar estilos | Cumple | FCP 0,9 s; React no pinta sin estilos (los módulos esperan la hoja, regla de HTML) |
| RF-004 – Zod fuera del inicio y configurado | Cumple | Mapa de fuentes del build: 0 archivos de Zod y de esquemas en el paquete inicial; la validación funciona sin errores de CSP |
| RF-005 – Nada cambia | Cumple | Pruebas de las specs 001 y 002 (igual que antes) y de reserva, login y registro |
| RF-006 – Sin cambios en API, compartidos ni CSP | Cumple | El diff sólo toca el front; `lib/validations` y `vercel.json` sin cambios |
| CE-001 – LCP de reservas ≥ 0,5 s menos | Cumple | 3,0 → 2,2 s (−0,8 s) |
| CE-002 – ≥ 400 KB menos con mapa | Cumple | 731 → 283 KB (−448 KB) |
| CE-003 – FCP < 1,2 s | Cumple | 0,9 s en portada, login y reservas |
| CE-004 – Paquete inicial sin Zod | Cumple | Ver RF-004 |
| CE-005 – Todo sigue funcionando | Cumple | Reserva con cédula inválida → "Ingresa un número de cédula válido…"; registro y login con sus mensajes; entra al panel; reportes 100 %; acceso igual que antes (la ventana de 680 px de alto ya estaba fuera de lo pedido en la spec 001) |
| CE-006 – Speed Insights > 74 | Pendiente | Se verá en Vercel unos días después de publicar, con visitas reales |

**Pruebas automáticas**: `npm run build` y `npm run lint` sin errores ni avisos.

## Cambios respecto al plan

- **Las páginas de acceso siguen en la carga inicial.** El plan las pasaba a cargarse por ruta,
  pero medido así el login empeoraba: su contenido aparecía en 1,9 s en vez de 1,7 s. Ahora el
  login y el registro piden sus esquemas en segundo plano al abrirse y los esperan al enviar
  (`auth-schemas.ts`).
- **Las mediciones finales usan HTTP/2**, como Vercel. Con HTTP/1.1 los muchos archivos pequeños de
  la página de reservas se descargaban de 6 en 6 y la medición no se parecía a producción.

## Pendientes y riesgos

- **Archivos pequeños**: la página de reservas se descarga en unos 45 archivos pequeños. Con HTTP/2
  van en paralelo, pero agruparlos (opción `codeSplitting` de Rolldown) podría recortar algo más. No
  se hizo porque no estaba en lo aprobado.
- **La puntuación de Vercel** sólo cambiará con visitas reales después de publicar. Con pocas
  visitas puede variar mucho.
- **El service worker** no se registra con el certificado local de prueba. Es un aviso del entorno
  de prueba, no de la app.

## Commits

| Repo | Commit | Mensaje |
|---|---|---|
| agenda-front | 3d51a4a | Spec 003: velocidad en el celular |

## Cómo publicarlo

1. Sin migración.
2. PR `dev` → `main` en agenda-front.
3. Después de publicar: comprobar que el despliegue de Vercel quede "Ready", abrir una página de
   reservas en el celular y revisar Speed Insights (Mobile) en unos días.

## Texto para el PR

Velocidad en el celular (spec 003):
- la pantalla de carga aparece al instante;
- la página de reservas pide sus datos mientras carga la app (−0,8 s);
- el mapa sólo se descarga al verlo (−450 KB);
- el validador sale de la carga inicial.

Sin cambios en la API ni migración.

Reporte: [specs/003-velocidad-movil/reporte.md](https://github.com/jhordan-huera/agenda-front/blob/main/specs/003-velocidad-movil/reporte.md)
