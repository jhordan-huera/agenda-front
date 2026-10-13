// Página de reservas: pide los datos del negocio en cuanto llega la página, mientras se descarga la
// app (en un celular con 4G ahorra cerca de un segundo). La app reutiliza esta respuesta una vez
// (src/lib/api/client.ts). Es un archivo propio y no un script en línea: la CSP sólo permite 'self'.
(function () {
  var match = /^\/book\/([^/?#]+)\/?$/.exec(location.pathname);
  if (!match || !window.fetch) return;
  var path = "/public/businesses/" + match[1];
  window.__agendaEarly = {
    path: path,
    response: fetch("/api" + path, {
      credentials: "include",
      headers: { Accept: "application/json", "X-Requested-With": "fetch" },
    }),
  };
})();
