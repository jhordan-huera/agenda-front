// Datos que se piden en cuanto llega la página, mientras se descarga la app. La app reutiliza cada respuesta una
// sola vez y sólo en los primeros segundos (src/lib/api/client.ts). Es un archivo propio y no un script en línea: la
// CSP sólo permite 'self'.
// - Página de reservas: los datos del negocio, sin la cookie de sesión (la CDN la guarda un rato, spec 009). En un
//   celular con 4G ahorra cerca de un segundo (spec 003).
// - Panel del negocio (/dashboard): la sesión y, con ella, lo que el panel espera antes de mostrarse (el negocio, el
//   plan, los profesionales, los servicios, los pacientes, las citas por cerrar y, al propietario, su mensualidad).
//   Así el panel sale completo de una vez, sin saltos, y antes (2026-11-15).
// - Resumen del super admin (/admin): la sesión y las cifras, los negocios, las solicitudes y los referidos.
(function () {
  if (!window.fetch) return;
  var early = {};
  var get = function (path, credentials) {
    var response = fetch("/api" + path, {
      credentials: credentials,
      headers: { Accept: "application/json", "X-Requested-With": "fetch" },
    });
    early[path] = { response: response, at: Date.now() };
    return response;
  };
  var booking = /^\/book\/([^/?#]+)\/?$/.exec(location.pathname);
  if (booking) {
    get("/public/businesses/" + booking[1], "omit");
  } else if (/^\/(dashboard|admin)(\/|$)/.test(location.pathname)) {
    var admin = /^\/admin\/?$/.test(location.pathname);
    get("/auth/session", "include")
      .then(function (response) {
        return response.ok ? response.clone().json() : null;
      })
      .then(function (session) {
        if (!session) return;
        var paths = ["/users/" + encodeURIComponent(session.userId)];
        if (session.platformRole) {
          // El Resumen del super admin (/admin): lo que la página espera antes de mostrarse.
          if (!admin || session.twoFactorSetupRequired) return;
          paths.push("/admin/stats", "/admin/businesses", "/admin/plan-requests", "/admin/referral-rewards");
        } else if (session.businessId && /^\/dashboard/.test(location.pathname)) {
          var business = "/businesses/" + encodeURIComponent(session.businessId);
          paths.push(
            business,
            business + "/subscription",
            business + "/professionals",
            business + "/services",
            business + "/clients",
            business + "/appointments/to-close/count",
          );
          if (session.role === "owner") paths.push(business + "/billing");
        } else return;
        paths.forEach(function (path) {
          get(path, "include");
        });
      })
      .catch(function () {});
  }
  window.__agendaEarly = early;
})();
