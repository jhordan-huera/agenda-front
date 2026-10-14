// Página de reservas: pide los datos del negocio en cuanto llega la página, mientras se descarga la
// app (en un celular con 4G ahorra cerca de un segundo). La app reutiliza esta respuesta una vez
// (src/lib/api/client.ts). Es un archivo propio y no un script en línea: la CSP sólo permite 'self'.
// Sin la cookie de sesión: es una respuesta pública que la CDN guarda un rato (spec 009).
(function () {
  var match = /^\/book\/([^/?#]+)\/?$/.exec(location.pathname);
  if (!match || !window.fetch) return;
  var path = "/public/businesses/" + match[1];
  window.__agendaEarly = {
    path: path,
    response: fetch("/api" + path, {
      credentials: "omit",
      headers: { Accept: "application/json", "X-Requested-With": "fetch" },
    }),
  };
})();
